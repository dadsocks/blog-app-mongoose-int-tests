'use strict';

const chai = require('chai');
const chaiHttp = require('chai-http');
const faker = require('faker');
const mongoose = require('mongoose');
const expect = chai.expect;
const { BlogPost } = require('../models');
const {app, runServer, closeServer} = require('../server');
const { TEST_DATABASE_URL } = require('../config');

chai.use(chaiHttp);

function seedBlogData() {
  console.info('seeding blog-post data...yuh heard?');
  const seedData = [];

  for (let i = 1;i <= 10;i++) {
    seedData.push(generateBlogData());
  }

  return BlogPost.insertMany(seedData);

}

function generateBlogData() {
  return {
    author: {
      firstName: faker.name.firstName,
      lastName: faker.name.lastName
    },
    title: faker.lorem.words,
    content: faker.lorem.sentences,
    //created: faker.date.recent
  };
}

function tearDownDB() {
  console.warn('Deleting Database');
  return mongoose.connection.dropDatabase();
}

describe('BlogPost API', function() {

  before(function() {
    return runServer(TEST_DATABASE_URL);
  });

  beforeEach(function() {
    return seedBlogData();
  });

  afterEach(function() {
    return tearDownDB();
  });

  after(function() {
    return closeServer();
  });

  describe('GET endpoint', function() {

    it('Should return all existing blog posts', function() {
      let res;
      return chai.request(app)
      .get('/posts')
      .then(function(_res) {
        res = _res;
        expect(res).to.have.status(200);
        expect(res.body).to.have.lengthOf.at.least(1);
        return BlogPost.count();
      })
      .then(function(count) {
        expect(res.body).to.have.lengthOf(count);
      });
    });

    it('Should return blog posts with right fields', function() {
      let resPost;
      return chai.request(app)
      .get('/posts')
      .then(function(res) {
        expect(res).to.have.status(200);
        expect(res).to.be.json;
        expect(res.body).to.be.a('array');
        expect(res.body).to.have.lengthOf.at.least(1);

        res.body.forEach(function(post) {
          expect(post).to.be.a('object');
          expect(post).to.include.keys('id','author','title','content','created');
        });

        resPost = res.body[0];
        return BlogPost.findById(resPost.id);
      })
      .then(function(post) {
        expect(resPost.author).to.equal(post.authorName);
        expect(resPost.title).to.equal(post.title);
        expect(resPost.content).to.equal(post.content);
      });
    });
  });

  describe('POST endpoint', function() {

    it('Should add a new blog post', function() {

      const newPost = {
        title: faker.lorem.sentence(),
        author: {
          firstName: faker.name.firstName(),
          lastName: faker.name.lastName(),
        },
        content: faker.lorem.text()
      };

      return chai.request(app)
      .post('/posts')
      .send(newPost)
      .then(function(res) {
        expect(res).to.have.status(201);
        expect(res).to.be.json;
        expect(res.body).to.be.a('object');
        expect(res.body).to.include.keys('id','author','title','content','created');
        expect(res.body.id).to.not.be.null;
        // expect(res.body.author.firstName).to.equal(newPost.author.firstName);
        expect(res.body.author).to.equal(`${newPost.author.firstName} ${newPost.author.lastName}`);
        expect(res.body.title).to.equal(newPost.title);
        expect(res.body.content).to.equal(newPost.content);
        return BlogPost.findById(res.body.id);
      })
      .then(function(post) {
        expect(post.author.firstName).to.equal(newPost.author.firstName);
        expect(post.author.lastName).to.equal(newPost.author.lastName);
        expect(post.title).to.equal(newPost.title);
        expect(post.content).to.equal(newPost.content);
      });
    });
  });

  describe('PUT endpoint', function() {

    it('Should update post fields', function() {

      const updateData = {
        title: 'New Title',
        content: 'New blog post about foo bar'
      };

      return BlogPost
        .findOne()
        .then(function(post) {
          updateData.id = post.id;

          return chai.request(app)
            .put(`/posts/${post.id}`)
            .send(updateData);
        })
        .then(function(res) {
          expect(res).to.have.status(204);

          return BlogPost.findById(updateData.id);
        })
        .then(function(post) {
          expect(post.title).to.equal(updateData.title);
          expect(post.content).to.equal(updateData.content);
        });
    });
  });

  describe('DELETE endpoint', function() {
    it('Should delete post by id', function() {
      let post;

      return BlogPost
        .findOne()
        .then(function(_post) {
          post = _post;
          return chai.request(app).delete(`/posts/${post.id}`);
        })
        .then(function(res) {
          expect(res).to.have.status(204);
          return BlogPost.findById(post.id);
        })
        .then(function(_post) {
          expect(_post).to.be.null;
        });
    });
  });
});
