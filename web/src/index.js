import React, { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom/client';
import axios from 'axios';
import './index.css';

const baseUrl = 'http://localhost:3000';

function App() {
  let [stories, setStories] = useState([]);
  let [isLoading, setLoading] = useState(true);
  let [isNewEntry, setNewEntry] = useState(false);

  const searchInputRef = useRef(null);

  const titleInput = useRef(null);
  const categoryInput = useRef(null);
  const bodyInput = useRef(null);

  // const [newStory, setNewStory] = useState({
  //   title: '',
  //   category: '',
  //   body: ''
  // });

  useEffect(() => {
    axios.get(`${baseUrl}/api/mongo/stories`)
      .then((response) => {
        setStories(response.data.data);
        setLoading(false);
      })
      .catch((error) => {
        console.error('Error fetching stories:', error);
        setLoading(false);
      });

    // fetch('http://localhost:3000/api/stories')
    //   .then((response) => response.json())
    //   .then((result) => {
    //     setStories(result.data);
    //     setLoading(false);
    //   });

    return () => {
      //clean up
    };
  }, []);

  const handleNewStorySubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    const newStory = {
      title: titleInput.current.value,
      category: categoryInput.current.value,
      body: bodyInput.current.value
    }
    axios.post(`${baseUrl}/api/mongo/story/`, newStory).then(() => {
      alert('Saved...');

      setNewEntry(false);
      setLoading(false);
    }).catch((error) => {
      console.error('Error creating story:', error);
      alert('Error...');
      setLoading(false);
    });
  }

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setStories([]);

    setLoading(true);

    const resp = axios.get(`${baseUrl}/api/mongo/story?q=${searchInputRef.current.value}`).then((res) => {
      setLoading(false);
      setStories(res.data.data);
    }).catch((error) => {
      console.error('Error:', error);
      alert('Error...');
      setLoading(false);
    });
  }

  return (<>
    {(isNewEntry) ? (<form onSubmit={(e) => { handleNewStorySubmit(e) }}>
      <div className="f-card">
        <h3>Create New Story</h3>
        <label htmlFor="title">Title:</label><br />
        <input ref={titleInput} type="text" name="title" placeholder="Enter the title" required /><br />

        <label htmlFor="category">Category:</label><br />
        <input ref={categoryInput} type="text" name="category" placeholder="Enter the category" required /><br />

        <label htmlFor="body">Body:</label><br />
        <textarea ref={bodyInput} name="body" rows="4" cols="50" placeholder="Enter the post content" required ></textarea><br /><br />

        <input type="submit" value="Submit"></input>
        <input type="button" value="Cancel" onClick={() => { setNewEntry(false); }}></input>
      </div>
    </form>) : (<button className="btn primary" onClick={() => { setNewEntry(true) }}>Create a New Story</button>)}

    <form className='search-bar' onSubmit={(e) => { handleSearchSubmit(e) }}>
      <input type="text" name="query" placeholder="Search" ref={searchInputRef} />
      <button type="submit">Search</button>
    </form>

    <div className="">
      {/* {
      (isLoading ? "Yes" : "No")
    } */}
      {
        (stories.length > 0) ? stories.map((story) => (
          <Story key={story.id} data={story} />
        )) : (isLoading ? <span>Loading...</span> : <h3>No stories to display</h3>)
      }
    </div>
  </>
  )
}

function Story(props) {
  const { title, category, body } = props.data.metadata;
  
  const [isEditing, setEditing] = useState(false);
  let [editingStoryID, setEditingStoryID] = useState(null);

  const handleDelete = (story_id) => {
    //setLoading(true);
    axios.delete(`${baseUrl}/api/mongo/story/${story_id}`)
      .then(() => {
        // Remove the deleted story from the state
        //setStories((prevStories) => prevStories.filter((story) => story.id !== story_id));
        alert('Story Removed...');
        //setLoading(false);
      })
      .catch((error) => {
        console.error('Error deleting story:', error);
        alert('Error...');
        //setLoading(false);
      });
  }

  const handleEdit = (story_id) => {
    //setLoading(true);
    setEditingStoryID(story_id);
    setEditing(true);
    //setLoading(false);
  }

  const handleEditSubmit = (e) => {
    e.preventDefault();
    //setLoading(true);

    const updateStory = {
      'title': e.target.titleInput.value,
      'category': e.target.categoryInput.value,
      'body': e.target.bodyInput.value
    }
    axios.put(`${baseUrl}/api/mongo/story/${editingStoryID}`, updateStory).then(() => {
      alert('Updated...');

      setEditingStoryID(null);
      setEditing(false);
      //setLoading(false);
    }).catch((error) => {
      console.error('Error updating story:', error);
      alert('Error...');
      //setLoading(false);
    });
  }

  return (
    // (isEditing ? "Yes" : "No")
    (!isEditing ?
      <div className="f-card">
        <div className="header">
          <div className="co-name"><a href="javascript:void(0)">{title}</a></div>
          <div className="time"><a className="category" href="javascript:void(0)">{category}</a></div>
        </div>
        <div className="content">
          <p>{body}</p>
        </div>
        <div className="controls">
          <button className="btn-action secondary" onClick={() => { handleEdit(props.data.id) }}>Edit</button>
          <button className="btn-action danger" onClick={() => { handleDelete(props.data.id) }} >Delete</button>
        </div></div> :
      <form onSubmit={(e) => { handleEditSubmit(e) }}>
        <div className="f-card">
          <h3>Updating Story <small>({editingStoryID})</small></h3>
          <label htmlFor="title">Title:</label><br />
          <input value={title} id="titleInput" type="text" name="title" placeholder="Enter the title" required /><br />

          <label htmlFor="category">Category:</label><br />
          <input value={category} id="categoryInput" type="text" name="category" placeholder="Enter the category" required /><br />

          <label htmlFor="body">Body:</label><br />
          <textarea value={body} id="bodyInput" name="body" rows="4" cols="50" placeholder="Enter the post content" required ></textarea><br /><br />

          <input type="submit" value="Submit"></input>
          <input type="button" value="Cancel" onClick={() => { setEditingStoryID(null); setEditing(false) }}></input>
        </div>
      </form>))
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <App />
);