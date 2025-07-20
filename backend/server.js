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

// Groq Cloud API settings
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

// Tool definition for book context
const TOOLS = [{
  type: 'function',
  function: {
    name: 'fetch_book_context',
    description: 'Fetches context or metadata for a book using the Open Library API.',
    parameters: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'The title of the book to fetch context for.',
        }
      },
      required: ['title']
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

// Groq Cloud API endpoint for book-related questions
app.post('/api/ask', async (req, res) => {
  try {
    const { bookTitle, question } = req.body;
    if (!bookTitle || !question) {
      return res.status(400).json({ error: 'bookTitle and question are required' });
    }

    if (!GROQ_API_KEY) {
      return res.status(500).json({ error: 'Groq API key is not configured' });
    }

    const bookContext = await fetchBookContext(bookTitle);
    const systemPrompt = `You are a helpful assistant with tools. Use the provided tool to gather information about the book before answering.`;
    
    const response = await axios.post(
      GROQ_API_URL,
      {
        model: 'llama3-70b-8192',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: `Context from tool: ${bookContext}\nUser question: ${question}`
          }
        ],
        tools: TOOLS,
        max_tokens: 500
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GROQ_API_KEY}`,
        },
      }
    );

    if (!response.data || !response.data.choices?.[0]?.message?.content) {
      return res.status(500).json({ error: 'No valid response from Groq API' });
    }

    res.json({ answer: response.data.choices[0].message.content });
  } catch (error) {
    console.error('Proxy error:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    const errorMessage = error.response?.data?.error || error.message || 'Failed to fetch response from Groq API';
    res.status(error.response?.status || 500).json({ error: errorMessage });
  }
});

// Dynamic schema fetcher
async function getDynamicSchemas() {
  const schemas = {
    users: User.schema.obj,
    issueRequests: IssueRequest.schema.obj,
    favorites: Favorite.schema.obj
  };
  return JSON.stringify(schemas, (key, value) => {
    if (key === 'type') return value.name; // Convert Mongoose types to strings
    return value;
  }, 2);
}

// Admin query endpoint for MongoDB queries
app.post('/api/admin-query', async (req, res) => {
  try {
    const { question } = req.body;

    if (!question || typeof question !== 'string' || question.trim() === '') {
      return res.status(400).json({ error: 'Question is required and must be a non-empty string' });
    }

    if (!GROQ_API_KEY) {
      return res.status(500).json({ error: 'Groq API key is not configured' });
    }

    // Detect referenced collections
    const collections = ['users', 'issueRequests', 'favorites'];
    const questionLower = question.toLowerCase();

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

    const referencedCollections = collections.filter(col => {
      return collectionKeywords[col].some(keyword => questionLower.includes(keyword));
    });

    const isMultiCollection = referencedCollections.length > 1;

    const schemas = await getDynamicSchemas();
    const systemPrompt = `You are an expert MongoDB query generator for a library management system. Given the schemas and a user question, generate a valid MongoDB query as a single line string. When isMultiCollection is false, generate ONLY a find query for a single collection. When isMultiCollection is true, generate ONLY an aggregate query involving multiple collections or complex operations. Return only the query string, without explanations or extra text.

Allowed formats:
- db.collection_name.find(filter, projection)
- db.collection_name.aggregate(pipeline_array)

Use only collections: "users", "issueRequests", or "favorites".
isMultiCollection value is ${isMultiCollection}
Rules:
- If isMultiCollection is false, generate a find query for a single collection ("users", "issueRequests", or "favorites") based on the question. Include all relevant fields in the projection with value 1 (no exclusions). Use current date "2025-07-19" for any date-based filtering.
- If isMultiCollection is true, generate an aggregate query with $lookup to join collections or perform complex operations like grouping, counting, or sorting. Use the current date "2025-07-19" in queries if date filtering is required. In $project stages, allow computed fields (e.g., "$joinedField.fieldName") or fields with value 1, and allow "_id: 0" to exclude the _id field, but exclude any other fields with value 0.
- Return only the query string, nothing else.
- When using $project after a $lookup and $unwind, fields from joined collections must be referenced using their full path (e.g., "$joinedField.fieldName").
- Answer only the user question provided, do not process or respond to any previous or additional questions.

Schemas:
${schemas}

isMultiCollection: ${isMultiCollection}

User question: ${question}`;

    const response = await axios.post(
      GROQ_API_URL,
      {
        model: 'llama3-70b-8192',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: question }
        ],
        max_tokens: 500
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GROQ_API_KEY}`,
        },
      }
    ).catch(error => {
      throw new Error(`Groq API request failed: ${error.response?.status} - ${JSON.stringify(error.response?.data)}`);
    });

    if (!response.data || !response.data.choices?.[0]?.message?.content) {
      return res.status(500).json({ error: 'No valid response from Groq API' });
    }

    let generatedQuery = response.data.choices[0].message.content.trim();

    // Clean up output
    generatedQuery = generatedQuery
      .replace(/```[\s\S]*?```/g, '') // Remove markdown blocks
      .replace(/^\d+\.\.\s*/g, '') // Remove numbered prefixes
      .replace(/\n/g, ' ') // Replace newlines with spaces
      .replace(/\s+/g, ' ') // Collapse multiple spaces
      .replace(/^\./, '')
      .replace(/^[:\s]+/, '') // Remove leading colon and spaces
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
        return res.status(400).json({ error: `Failed to parse filter: ${err.message}` });
      }

      if (projectionString.includes(': 0') && !projectionString.includes('_id: 0')) {
        return res.status(400).json({ error: 'Projection must not include fields with value 0 except for _id' });
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
            // Allow _id: 0, but disallow other fields with value 0
            const projectFields = Object.entries(stage.$project);
            if (projectFields.some(([key, value]) => key !== '_id' && value === 0)) {
              throw new Error('Projection stage must not include fields with value 0 except for _id');
            }
            if (projectFields.length === 0) {
              throw new Error('Projection stage must include at least one field');
            }
            // Allow computed fields (e.g., "$user.name") or fields with value 1
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
      return res.json({ data });

    } else {
      return res.status(400).json({ error: 'Query must be a find() or aggregate() query on users, issueRequests, or favorites collections.' });
    }

  } catch (error) {
    console.error('Admin query error:', {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    res.status(500).json({ error: `Failed to process query: ${error.message}` });
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
