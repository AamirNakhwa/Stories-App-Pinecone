//https://codepen.io/Aamir-Nakhwa/pen/poqROJN

import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import Flickity from 'react-flickity-component'

const flickityOptions = {
  initialIndex: 2,
  wrapAround: true
}

function App() {
  return <div className="book-store">
    <div className="header">
      <div className="browse">
        <div className="search-bar">
          <input type="text" placeholder="Search Story" />
        </div>
      </div>
      <div className="header-title">Social <span>Stories</span></div>
      <div className="profile">
        <div className="user-profile">
          <img src="https://randomuser.me/api/portraits/women/63.jpg" alt="" className="user-img" />
        </div>
      </div>
    </div>
    <div className="book-slide">
      <Flickity
        className='book js-flickity' // default ''
        elementType={'div'} // default 'div'
        options={flickityOptions} // takes flickity options {}
        disableImagesLoaded={false} // default false
        reloadOnUpdate // default false
        static // default false
      >
        <div className="book-cell">
          <div className="book-img">
            <img src="https://images-na.ssl-images-amazon.com/images/I/81WcnNQ-TBL.jpg" alt="" className="book-photo" />
          </div>
          <div className="book-content">
            <div className="book-title">BIG MAGIC</div>
            <div className="book-author">by Elizabeth Gilbert</div>
            <div className="rate">
              <fieldset className="rating">
                <input type="checkbox" id="star5" name="rating" value="5" />
                <label className="full" htmlFor="star5"></label>
                <input type="checkbox" id="star4" name="rating" value="4" />
                <label className="full" htmlFor="star4"></label>
                <input type="checkbox" id="star3" name="rating" value="3" />
                <label className="full" htmlFor="star3"></label>
                <input type="checkbox" id="star2" name="rating" value="2" />
                <label className="full" htmlFor="star2"></label>
                <input type="checkbox" id="star1" name="rating" value="1" />
                <label className="full" htmlFor="star1"></label>
              </fieldset>
              <span className="book-voters">1.987 voters</span>
            </div>
            <div className="book-sum">Readers of all ages and walks of life have drawn inspiration and empowerment from Elizabeth Gilbert’s books for years. </div>
            <div className="book-see">See The Book</div>
          </div>
        </div>
        
      </Flickity>
    </div>
  </div >
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <App />
);