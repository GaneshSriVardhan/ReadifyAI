require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');
const cors = require('cors');
const mongodbQueryParser = require('mongodb-query-parser').default;

const userRoutes = require('./routes/userRoutes');
const issueRequestsRoutes = require('./routes/issueRequestsRoutes');
const favoritesRoutes = require('./routes/favoritesRoutes');
const User = require('./models/User');
const IssueRequest = require('./models/IssueRequest');
const Favorite = require('./models/Favorite');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use('/api/users', userRoutes);
app.use('/api/issueRequests', issueRequestsRoutes);
app.use('/api/favorites', favoritesRoutes);

// Basic route to confirm server is running
app.get('/', (req, res) => {
  res.json({ message: 'Server is running' });
});

// Hugging Face API settings
const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY;
const HUGGINGFACE_API_URL = 'https://api-inference.huggingface.co/models/mistralai/Mixtral-8x7B-Instruct-v0.1';

// Retry logic for rate limit and transient errors
const retryRequest = async (url, data, headers, retries = 3, delay = 1000) => {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await axios.post(url, data, { headers });
      return response;
    } catch (error) {
      if ([429, 503].includes(error.response?.status) && i < retries - 1) {
        console.log(`Error ${error.response?.status} at ${url}, retrying in ${delay * Math.pow(2, i)}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
        continue;
      }
      throw error;
    }
  }
};

// Tool definition for book context
const TOOLS = [{
  name: 'fetch_book_context',
  description: 'Fetches context or metadata for a book using the Open Library API.',
  parameters: {
    title: {
      description: 'The title of the book to fetch context for.',
      type: 'str',
      default: ''
    }
  }
}];

// Fetch book context from Open Library
async function fetchBookContext(title) {
  try {
    const searchUrl = `https://openlibrary.org/search.json?q=${encodeURIComponent(title)}`;
    const res = await axios.get(searchUrl);
    const data = res.data;
    const firstBook = data.docs?.[0];
    if (!firstBook) {
      return `No context found for "${title}". Please check the book title.`;
    }
    const context = {
      title: firstBook.title || 'Unknown Title',
      author: firstBook.author_name?.[0] || 'Unknown Author',
      publishYear: firstBook.first_publish_year || 'Unknown Year',
      isbn: firstBook.isbn?.[0] || 'Unknown ISBN',
    };
    return `Context for "${title}": Title: ${context.title}, Author: ${context.author}, Published: ${context.publishYear}, ISBN: ${context.isbn}.`;
  } catch (error) {
    console.error('Error fetching book context:', {
      error: error.message,
      timestamp: new Date().toISOString()
    });
    return `Error fetching context for "${title}": ${error.message}`;
  }
}

// Hugging Face API endpoint for book-related questions
app.post('/api/ask', async (req, res) => {
  try {
    const { bookTitle, question } = req.body;
    if (!bookTitle || !question) {
      return res.status(400).json({ error: 'bookTitle and question are required' });
    }

    if (!HUGGINGFACE_API_KEY) {
      return res.status(500).json({ error: 'Hugging Face API key is not configured' });
    }

    const bookContext = await fetchBookContext(bookTitle);
    const systemPrompt = `You are a helpful assistant with access to book metadata. Use the provided context to answer the user's question about the book. Return only the answer, without explanations or extra text.

Context: ${bookContext}

User question: ${question}`;
    const prompt = `<|begin|>System: ${systemPrompt} User: ${question} Assistant: `;

    const response = await retryRequest(
      HUGGINGFACE_API_URL,
      {
        inputs: prompt,
        parameters: { max_new_tokens: 200, return_full_text: false, temperature: 0.3 }
      },
      {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${HUGGINGFACE_API_KEY}`
      }
    );

    if (!response.data || !response.data[0]?.generated_text) {
      return res.status(500).json({ error: 'No valid response from Hugging Face API' });
    }

    res.json({ answer: response.data[0].generated_text.trim() });
  } catch (error) {
    console.error('Proxy error:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    const errorMessage = error.response?.status === 404
      ? 'Hugging Face model not found. Please verify the model ID.'
      : error.response?.data?.error || error.message || 'Failed to fetch response from Hugging Face API';
    res.status(error.response?.status || 500).json({ error: errorMessage });
  }
});

// Admin query endpoint for MongoDB queries
app.post('/api/admin-query', async (req, res) => {
  try {
    const { question } = req.body;

    if (!question || typeof question !== 'string' || question.trim() === '') {
      return res.status(400).json({ error: 'Question is required and must be a non-empty string' });
    }

    if (!HUGGINGFACE_API_KEY) {
      return res.status(500).json({ error: 'Hugging Face API key is not configured' });
    }

    // Detect referenced collections
    const collections = ['users', 'issueRequests', 'favorites'];
    const questionLower = question.toLowerCase();

    // Define keywords for each collection based on their schema
    const collectionKeywords = {
      users: [
        'user', 'users', 'student', 'students', 'faculty', 'admin',
        'name', 'email', 'rollnumber', 'roll number', 'role', 'password', 'verified'
      ],
      issueRequests: [
        'issuerequest', 'issuerequests', 'issue', 'request', 'requests', 'book',
        'title', 'status', 'pending', 'issued', 'rejected', 'returned', 'return date',
        'fine', 'fineperday', 'rejection', 'reason', 'requested'
      ],
      favorites: [
        'favorite', 'favorites', 'favourite', 'favourites', 'liked', 'saved'
      ]
    };

    // Detect referenced collections based on keywords
    const referencedCollections = collections.filter(col => {
      return collectionKeywords[col].some(keyword => questionLower.includes(keyword));
    });

    const isMultiCollection = referencedCollections.length > 1;

    const schemas = `
      User Schema:
      {
        name: String, required: true
        email: String, required: true, unique
        role: String, enum ["Admin", "Student", "Faculty"], required: true
        rollNumber: String, required if role is "Student"
        password: String, required: true
        verificationToken: String
        isVerified: Boolean, default: false
        booksCanRequest: Number, default: 3 for Students, min: 0
        timestamps: true
        collection: "users"
      }

      IssueRequest Schema:
      {
        bookId: String, required: true
        title: String, required: true
        email: String, required: true
        role: String, enum ["Student", "Faculty"], required: true
        status: String, enum ["Pending", "Issued", "Rejected", "Returned"], default: "Pending"
        requestedAt: Date, default: Date.now
        returnDate: Date, required if status is "Issued" and role is "Student"
        finePerDay: Number, min: 0
        reasonForRejection: String, required if status is "Rejected"
        timestamps: true
        collection: "issueRequests"
      }

      Favorite Schema:
      {
        bookId: String, required: true
        title: String, required: true
        email: String, required: true
        role: String, enum ["Student", "Faculty", "Admin"], required: true
        timestamps: true
        collection: "favorites"
      }
    `;

    const systemPrompt = `You are an expert MongoDB query generator for a library management system. Given the schemas and user question, generate a valid MongoDB query. When isMultiCollection is false, generate ONLY a find query for a single collection. When isMultiCollection is true, generate ONLY an aggregate query with $lookup and $unwind to join collections. Return the query as a single-line string, without explanations or extra text.

Allowed formats:
- db.collection_name.find(filter, projection)
- db.collection_name.aggregate(pipeline_array)



Use only collections: "users", "issueRequests", or "favorites".
Rules:
- If isMultiCollection is false, generate a find query for a single collection with all relevant fields in the projection (value 1, no exclusions). Use "2025-06-18" for date-based filtering.
- If isMultiCollection is true, generate an aggregate query with $lookup and $unwind. In $project, include only fields with value 1. Use "2025-06-18" for date-based filtering if needed.
- Return only the query string.
- For $project after $lookup/$unwind, reference joined fields with full path (e.g., "$requests.status").
- Answer only the provided question.

Schemas:
${schemas}

isMultiCollection: ${isMultiCollection}

User question: ${question}`;
    const prompt = `<|begin|>System: ${systemPrompt} User: ${question} Assistant: `;

    const response = await retryRequest(
      HUGGINGFACE_API_URL,
      {
        inputs: prompt,
        parameters: { max_new_tokens: 150, return_full_text: false, temperature: 0.3 }
      },
      {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${HUGGINGFACE_API_KEY}`
      }
    );

    if (!response.data || !response.data[0]?.generated_text) {
      return res.status(500).json({ error: 'No valid response from Hugging Face API' });
    }

    let generatedQuery = response.data[0].generated_text.trim();

    // Clean up output
    generatedQuery = generatedQuery
      .replace(/```[\s\S]*?```/g, '') // Remove markdown blocks
      .replace(/^\d+\.\.\s*/g, '') // Remove numbered prefixes
      .replace(/\n/g, ' ') // Replace newlines with spaces
      .replace(/\s+/g, ' ') // Collapse multiple spaces
      .replace(/^\./, '')
      .replace(/^[:\s]+/, '')
      .trim();

    console.log('Admin query details:', {
      question,
      generatedQuery,
      referencedCollections,
      isMultiCollection,
      timestamp: new Date().toISOString()
    });

    // Process find query
    if (generatedQuery.startsWith('db.users.find(') ||
        generatedQuery.startsWith('db.issueRequests.find(') ||
        generatedQuery.startsWith('db.favorites.find(')) {

      if (isMultiCollection) {
        return res.status(400).json({ 
          error: 'Query involves multiple collections and requires an aggregation pipeline, not a find query',
          generatedQuery
        });
      }

      const collectionName = generatedQuery.match(/db\.(\w+)\.find/)[1];
      const findStart = generatedQuery.indexOf('.find(') + 6;
      const findEnd = generatedQuery.lastIndexOf(')');
      const argsString = generatedQuery.substring(findStart, findEnd).trim();

      let splitIndex = -1;
      let braceCount = 0;
      for (let i = 0; i < argsString.length; i++) {
        const char = argsString[i];
        if (char === '{') braceCount++;
        else if (char === '}') braceCount--;
        else if (char === ',' && braceCount === 0) {
          splitIndex = i;
          break;
        }
      }

      if (splitIndex === -1) {
        return res.status(400).json({ error: 'Invalid find query: cannot split filter and projection' });
      }

      const filterString = argsString.slice(0, splitIndex).trim();
      const projectionString = argsString.slice(splitIndex + 1).trim();

      let filter;
      try {
        filter = mongodbQueryParser(filterString);
      } catch (err) {
        return res.status(400).json({ error: 'Failed to parse filter: ' + err.message });
      }

      if (projectionString.includes(': 0')) {
        return res.status(400).json({ error: 'Projection must only include fields with value 1 (no exclusions allowed)' });
      }
      if (!projectionString.includes(': 1')) {
        return res.status(400).json({ error: 'Projection must include at least one field with value 1' });
      }

      const projection = {};
      const projFields = projectionString.slice(1, -1).split(',').map(f => f.trim());
      for (const f of projFields) {
        const [key, val] = f.split(':').map(x => x.trim());
        projection[key] = parseInt(val);
      }

      let data;
      if (collectionName === 'users') {
        data = await User.find(filter, projection).lean();
      } else if (collectionName === 'issueRequests') {
        data = await IssueRequest.find(filter, projection).lean();
      } else if (collectionName === 'favorites') {
        data = await Favorite.find(filter, projection).lean();
      } else {
        return res.status(400).json({ error: 'Invalid collection in find query' });
      }

      return res.json({ data });

    } else if (generatedQuery.startsWith('db.users.aggregate(') ||
               generatedQuery.startsWith('db.issueRequests.aggregate(') ||
               generatedQuery.startsWith('db.favorites.aggregate(')) {

      const collectionName = generatedQuery.match(/db\.(\w+)\.aggregate/)[1];
      const aggStart = generatedQuery.indexOf('.aggregate(') + 11;
      const aggEnd = generatedQuery.lastIndexOf(')');
      const pipelineString = generatedQuery.substring(aggStart, aggEnd).trim();

      let pipeline;
      try {
        pipeline = mongodbQueryParser(pipelineString);
        if (!Array.isArray(pipeline)) throw new Error('Pipeline is not an array');
        for (const stage of pipeline) {
          if (!stage || typeof stage !== 'object') throw new Error('Invalid pipeline stage');
          const stageOperator = Object.keys(stage)[0];
          if (!stageOperator.startsWith('$')) throw new Error('Pipeline stage must start with $ operator');
          if (stage.$project) {
            const updatedProject = {};
            for (const [key, value] of Object.entries(stage.$project)) {
              if (value === 1) {
                updatedProject[key] = value;
              }
            }
            if (Object.keys(updatedProject).length === 0) {
              throw new Error('Projection stage must include at least one field with value 1');
            }
            stage.$project = updatedProject;
          }
        }
      } catch (err) {
        return res.status(400).json({ error: `Failed to parse aggregation pipeline: ${err.message}` });
      }

      let data;
      try {
        if (collectionName === 'users') {
          data = await User.aggregate(pipeline);
        } else if (collectionName === 'issueRequests') {
          data = await IssueRequest.aggregate(pipeline);
        } else if (collectionName === 'favorites') {
          data = await Favorite.aggregate(pipeline);
        } else {
          return res.status(400).json({ error: 'Invalid collection in aggregate query' });
        }
      } catch (err) {
        return res.status(400).json({ error: `Aggregation query execution failed: ${err.message}` });
      }
      console.log(data);
      return res.json({ data });

    } else {
      return res.status(400).json({ error: 'Query must be a find() or aggregate() query on users, issueRequests, or favorites collections.' });
    }

  } catch (error) {
    console.error('Admin query error:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    const errorMessage = error.response?.status === 404
      ? 'Hugging Face model not found. Please verify the model ID.'
      : error.response?.data?.error || error.message || 'Failed to process query';
    res.status(error.response?.status || 500).json({ error: errorMessage });
  }
});

// MongoDB connection
const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/ebook_store';
console.log('Attempting MongoDB connection:', {
  uri: mongoUri,
  timestamp: new Date().toISOString()
});

mongoose.connect(mongoUri, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => {
    console.log('MongoDB connection successful:', {
      uri: mongoUri,
      database: 'ebook_store',
      timestamp: new Date().toISOString()
    });
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => console.log(`Server started on port ${PORT}`, {
      timestamp: new Date().toISOString()
    }));
  })
  .catch(err => {
    console.error('MongoDB connection error:', {
      error: err.message,
      uri: mongoUri,
      stack: err.stack,
      timestamp: new Date().toISOString()
    });
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => console.log(`Server started on port ${PORT} (without MongoDB)`, {
      timestamp: new Date().toISOString()
    }));
  });
