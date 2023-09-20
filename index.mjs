import express from 'express';
import { customAlphabet } from 'nanoid'
const nanoid = customAlphabet('1234567890', 20)
import cors from 'cors';
import path from 'path';
import morgan from 'morgan';
import OpenAI from "openai";
import dotenv from 'dotenv';
import { PineconeClient } from "@pinecone-database/pinecone";
import { MongoClient, ObjectId, ServerApiVersion } from 'mongodb';
import { Console } from 'console';

const __dirname = path.resolve();
dotenv.config();

const dbName = 'stories_vector';
const collectionName = 'stories';

const uri = `mongodb+srv://${process.env.MONGO_DB_USER}:${process.env.MONGO_DB_PASSWORD}@cluster0.ygowwij.mongodb.net/?retryWrites=true&w=majority`;
console.log(uri);

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri
    // , {
    // serverApi: {
    //version: ServerApiVersion.v1,
    //strict: true,
    //deprecationErrors: true,
    //}}
);

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

console.log('OpenAI initialized...');

const pinecone = new PineconeClient();
await pinecone.init({
    environment: process.env.PINECONE_ENVIRONMENT,
    apiKey: process.env.PINECONE_API_KEY,
});

//https://github.com/pinecone-io/pinecone-ts-client/blob/main/README.md
//To Create Index
// await pinecone.createIndex({
//     name: 'sample-index',
//     dimension: 1536,
// });

const indexName = process.env.PINECONE_INDEX_NAME;
const index = pinecone.Index(indexName);

const app = express();
const port = 3000;

app.use(express.json());
app.use(cors(["http://localhost:3000", "127.0.0.1", "*"]));
//app.use(morgan('combined'));

run();

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();
        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    }
    catch (e) {
        console.log("MongoDB Error!", e);
    }
    finally {
        // Ensures that the client will close when you finish/error
        //await client.close();
    }
}

app.get('/', (req, res) => {
    res.status(200).send('Welcome');
});

async function getEmbedding(queryText) {
    const response = await openai.embeddings.create({
        model: "text-embedding-ada-002",
        input: queryText,
    });
    return response?.data[0]?.embedding;
}

async function getEmbeddingAPI(query) {
    const url = 'https://api.openai.com/v1/embeddings';
    const openai_key = process.env.OPENAI_API_KEY;

    let response = await axios.post(url, {
        input: query,
        model: "text-embedding-ada-002"
    }, {
        headers: {
            'Authorization': `Bearer ${openai_key}`,
            'Content-Type': 'application/json'
        }
    });

    if (response.status === 200) {
        return response.data.data[0].embedding;
    } else {
        throw new Error(`Failed to get embedding. Status code: ${response.status}`);
    }
}

app.get('/api/stories', async (req, res) => {
    console.log('get /api/stories');

    try {
        const vector = await getEmbedding("");
        console.log("vector: ", vector);

        const index = pinecone.Index(process.env.PINECONE_INDEX_NAME);

        const queryResponse = await index.query({
            queryRequest: {
                vector: vector,
                topK: 100,
                includeValues: false,
                includeMetadata: true,
                //namespace: process.env.PINECONE_NAME_SPACE
                //PineconeError: PineconeClient: Error calling query: PineconeError: The requested feature 'Namespaces' is not supported by the current index type 'Starter'.
            }
        });

        queryResponse.matches.map(eachMatch => {
            console.log(`score ${eachMatch.score.toFixed(1)} => ${JSON.stringify(eachMatch.metadata)}\n\n`);
        })

        console.log(`${queryResponse.matches.length} records found `);
        console.log(queryResponse.matches)

        res.status(200).json({ message: "Success", data: queryResponse.matches });
    } catch (err) {
        console.error(`Something went wrong trying to find the records: ${err}\n`);
        res.status(500).json({ message: "Error", data: err });
    }
});

app.get('/api/story', async (req, res) => {
    const queryText = req.query.q;

    try {
        const vector = await getEmbedding(queryText);
        console.log("vector: ", vector);

        const index = pinecone.Index(process.env.PINECONE_INDEX_NAME);

        const queryResponse = await index.query({
            queryRequest: {
                vector: vector,
                topK: 100,
                includeValues: false,
                includeMetadata: true,
                //namespace: process.env.PINECONE_NAME_SPACE
                //PineconeError: PineconeClient: Error calling query: PineconeError: The requested feature 'Namespaces' is not supported by the current index type 'Starter'.
            }
        });

        queryResponse.matches.map(eachMatch => {
            console.log(`score ${eachMatch.score.toFixed(1)} => ${JSON.stringify(eachMatch.metadata)}\n\n`);
        })

        console.log(`${queryResponse.matches.length} records found `);
        console.log(queryResponse.matches)

        res.status(200).json({ message: "Success", data: queryResponse.matches });
    } catch (err) {
        console.error(`Something went wrong trying to find the records: ${err}\n`);
        res.status(500).json({ message: "Error", data: err });
    }
});

app.post('/api/story', async (req, res) => {
    const { title, category, body } = req.body;

    // Validate required information
    if (!title || !category || !body) {
        res.status(400).json({ message: 'Missing required information', data: null });
        return;
    }

    try {
        console.log('Going to create embedding using OpenAI');

        const vector = await getEmbedding(`${title} ${category} ${body}`);
        console.log("vector: ", vector);

        const index = pinecone.Index(process.env.PINECONE_INDEX_NAME);
        const upsertRequest = {
            vectors: [
                {
                    id: nanoid(), // unique id
                    values: vector,
                    metadata: {
                        title: title,
                        category: category,
                        body: body
                    }
                }
            ],
            //namespace: process.env.PINECONE_NAME_SPACE,
            //PineconeError: PineconeClient: Error calling query: PineconeError: The requested feature 'Namespaces' is not supported by the current index type 'Starter'.
        };

        const upsertResponse = await index.upsert({ upsertRequest });
        console.log("upsertResponse: ", upsertResponse);

        res.status(201).json({ message: 'Success', data: upsertResponse });
    } catch (err) {
        console.error(`Something went wrong trying to insert the new record: ${err}\n`);
        res.status(201).json({ message: 'Error', data: err });
    }
});

app.put('/api/story/:id', async (req, res) => {
    const _id = req.params.id;

    const { title, category, body } = req.body;

    // Validate required information
    if (!title || !category || !body) {
        res.status(400).json({ message: 'Missing required information', data: null });
        return;
    }

    // Validate required information
    if (!_id) {
        res.status(400).json({ message: 'ID is missing', data: null });
        return;
    }

    try {
        console.log('Going to create embedding using OpenAI');
        const vector = await getEmbedding(`${title} ${category} ${body}`);
        console.log("vector: ", vector);

        const index = pinecone.Index(process.env.PINECONE_INDEX_NAME);
        const upsertRequest = {
            vectors: [
                {
                    id: _id, // unique id
                    values: vector,
                    metadata: {
                        title: title,
                        category: category,
                        body: body
                    }
                }
            ],
            //namespace: process.env.PINECONE_NAME_SPACE,
            //PineconeError: PineconeClient: Error calling query: PineconeError: The requested feature 'Namespaces' is not supported by the current index type 'Starter'.
        };

        const upsertResponse = await index.upsert({ upsertRequest });
        console.log("upsertResponse: ", upsertResponse);

        res.status(201).json({ message: 'Success', data: upsertResponse });
    } catch (err) {
        console.error(`Something went wrong trying to update the new record: ${err}\n`);
        res.status(201).json({ message: 'Error', data: err });
    }
});

app.delete('/api/story/:id', async (req, res) => {
    const _id = req.params.id;

    // Validate required information
    if (!_id) {
        res.status(400).json({ message: 'ID is missing', data: null });
        return;
    }

    try {
        const deleteResponse = await index.delete1({
            ids: [_id],
            //namespace: process.env.PINECONE_NAME_SPACE
            //PineconeError: PineconeClient: Error calling delete1: PineconeError: The requested feature 'Namespaces' is not supported by the current index type 'Starter'
        })
        console.log(`Record deleted with ID ${_id}`);
        res.status(200).json({ message: 'Success', data: `Record deleted with ID ${_id}` });
    } catch (err) {
        console.error(`Something went wrong trying to delete one record: ${err}\n`);
        res.status(500).json({ message: 'Error', data: `Something went wrong trying to delete one record: ${err}\n` });
    }
});

//MongoDB Endpoints
app.get('/api/mongo/stories', async (req, res) => {
    await client.connect();

    const database = client.db(dbName);
    const collection = database.collection(collectionName);

    const findQuery = {};

    let _searchResult = [];
    let _records = [];

    try {
        //const findQuery = { title: { $regex: queryText } };

        _searchResult = await collection.find(findQuery);//.sort({ name: 1 });
        await _searchResult.forEach(rec => {
            console.log(`${rec.name}`);
            _records.push({
                _id: rec._id,
                title: rec.title,
                category: rec.category,
                body: rec.body
            });
        });
        console.log(_records);

        console.log(`${_records.length} records found `);
        console.log(_records)

        res.status(200).json({ message: "Success", data: _records });
    } catch (err) {
        console.error(`Something went wrong trying to find the records: ${err}\n`);
        res.status(500).json({ message: "Error", data: err });
    }

    await client.close();
});

app.get('/api/mongo/story', async (req, res) => {
    const queryText = req.query.q;
const vector = await getEmbedding(queryText);
console.log(vector)
    try {
        await client.connect();
        const database = client.db(dbName);
        const collection = database.collection(collectionName);

        // Query for similar documents.
        const _records = await collection.aggregate([
            {
                "$search": {
                    "index": "default",
                    "knnBeta": {
                        "vector": vector,
                        "path": "vector",
                        "k": 5
                    },
                    "scoreDetails": true
                },
                
            },
            {
                "$project": {
                  "vector": 0,
                  "score": { "$meta": "searchScore" },
                  "scoreDetails": { "$meta": "searchScoreDetails" }
                },
          
              }
        ]).toArray();

        console.log(_records.length, _records);

        return res.status(200).json({ message: "Success", data: _records });
    }
    catch (err) {
        console.error(`Something went wrong trying to find the records: ${err}\n`);
        res.status(500).json({ message: "Error", data: err });
    }

    await client.close();
});

app.post('/api/mongo/story', async (req, res) => {
    console.log('/api/mongo/story');
    const { title, category, body } = req.body;

    // Validate required information
    if (!title || !category || !body) {
        res.status(400).json({ message: 'Missing required information', data: null });
        return;
    }

    const newRecord = { //id, 
        title, category, body
    };

    await client.connect();

    const database = client.db(dbName);
    const collection = database.collection(collectionName);

    try {
        const result = await collection.insertOne(newRecord);
        console.log(`Successfully inserted record with _id: ${result.insertedId}`);

        //products.push(newProduct);
        await client.close();

        res.status(201).json({ message: 'Success', data: newRecord });
    } catch (err) {
        console.error(`Something went wrong trying to insert the new record: ${err}\n`);
        res.status(201).json({ message: 'Error', data: err });
    }
    await client.close();
});

app.put('/api/mongo/story/:id', async (req, res) => {
    const _id = req.params.id;

    const { title, category, body } = req.body;

    // Validate required information
    if (!title || !category || !body) {
        res.status(400).json({ message: 'Missing required information', data: null });
        return;
    }

    // Validate required information
    if (!_id) {
        res.status(400).json({ message: 'ID is missing', data: null });
        return;
    }

    await client.connect();

    const database = client.db(dbName);
    const collection = database.collection(collectionName);

    try {

        const findOneQuery = { _id: new ObjectId(_id) };

        const _record = await collection.findOne(findOneQuery);
        console.log(_record);

        if (!_record) {
            await client.close();
            res.status(404).json({ message: 'Record not found', data: null });
        } else {
            const updateDoc = {
                $set:
                {
                    title: title,
                    category: category,
                    body: body
                }
            };
            const updateOptions = { returnOriginal: false };

            let _updatedRecord;
            const updateResult = await collection.findOneAndUpdate(
                findOneQuery,
                updateDoc,
                updateOptions,
            );
            _updatedRecord = updateResult.value;
            console.log(`Here is the updated document:\n${JSON.stringify(updateResult.value)}\n`);

            await client.close();
            res.status(200).json({ message: 'Success', data: _updatedRecord });
        }
    } catch (err) {
        console.error(`Something went wrong trying to update the new record: ${err}\n`);
        res.status(201).json({ message: 'Error', data: err });
    }
});

app.delete('/api/mongo/story/:id', async (req, res) => {
    const _id = req.params.id;

    // Validate required information
    if (!_id) {
        res.status(400).json({ message: 'ID is missing', data: null });
        return;
    }

    await client.connect();

    const database = client.db(dbName);
    const collection = database.collection(collectionName);

    try {

        const findOneQuery = { _id: new ObjectId(_id) };

        const _record = await collection.findOne(findOneQuery);
        console.log(_record);

        if (!_record) {
            await client.close();
            res.status(404).json({ message: 'Record not found', data: null });
        } else {
            const deleteResult = await collection.deleteOne(findOneQuery);
            console.log(`Record deleted with ID ${_id}`);

            await client.close();
            res.status(200).json({ message: 'Success', data: _record });
        }
    } catch (err) {
        console.error(`Something went wrong trying to update the new record: ${err}\n`);
        res.status(201).json({ message: 'Error', data: err });
    }
});

app.get(express.static(path.join(__dirname, "./web/build")));
app.use("/", express.static(path.join(__dirname, "./web/build")));

//app.use('/static', express.static(path.join(__dirname, 'static')))

app.use((req, res) => {
    res.status(404).send("not found");
})

// Start the server
app.listen(port, () => {
    console.log(`Server is listening on port ${port}`);
});