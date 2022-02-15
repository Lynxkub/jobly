"use strict";

const request = require("supertest");

const db = require("../db.js");
const app = require("../app");
const User = require("../models/user");

const {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
  u1Token,
  u2Token,
  u3Token,
  testJobsId
} = require("./_testCommon");
const { NotFoundError } = require("../expressError.js");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/************************************** POST /users */

describe("POST /users", function () {
  test("works for users: create non-admin", async function () {
    const resp = await request(app)
        .post("/users")
        .send({
          username: "u-new",
          firstName: "First-new",
          lastName: "Last-newL",
          password: "password-new",
          email: "new@email.com",
          isAdmin: false,
        })
        .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(201);
    expect(resp.body).toEqual({
      user: {
        username: "u-new",
        firstName: "First-new",
        lastName: "Last-newL",
        email: "new@email.com",
        isAdmin: false,
      }, token: expect.any(String),
    });
  });

  test("works for users: create admin", async function () {
    const resp = await request(app)
        .post("/users")
        .send({
          username: "u-new",
          firstName: "First-new",
          lastName: "Last-newL",
          password: "password-new",
          email: "new@email.com",
          isAdmin: true,
        })
        .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(201);
    expect(resp.body).toEqual({
      user: {
        username: "u-new",
        firstName: "First-new",
        lastName: "Last-newL",
        email: "new@email.com",
        isAdmin: true,
      }, token: expect.any(String),
    });
  });

  test("unauth for anon", async function () {
    const resp = await request(app)
        .post("/users")
        .send({
          username: "u-new",
          firstName: "First-new",
          lastName: "Last-newL",
          password: "password-new",
          email: "new@email.com",
          isAdmin: true,
        });
    expect(resp.statusCode).toEqual(401);
  });

  test("bad request if missing data", async function () {
    const resp = await request(app)
        .post("/users")
        .send({
          username: "u-new",
        })
        .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(400);
  });

  test("bad request if invalid data", async function () {
    const resp = await request(app)
        .post("/users")
        .send({
          username: "u-new",
          firstName: "First-new",
          lastName: "Last-newL",
          password: "password-new",
          email: "not-an-email",
          isAdmin: true,
        })
        .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(400);
  });

  test("non admin requesting to create user" , async function() {
    const resp = await request(app).post("/users").send(
      {
        username: "u-new",
        firstName: "First-new",
        lastName: "Last-newL",
        password: "password-new",
        email: "not-an-email",
        isAdmin: true
      }).set("authorization" , `Bearer ${u2Token}`);
      expect(resp.statusCode).toEqual(401);
  })
});

/************************************** GET /users */

describe("GET /users", function () {
  test("works for users", async function () {
    const resp = await request(app)
        .get("/users")
        .set("authorization", `Bearer ${u1Token}`);
    expect(resp.body).toEqual({
      users: [
        {
          username: "u1",
          firstName: "U1F",
          lastName: "U1L",
          email: "user1@user.com",
          isAdmin: true,
        },
        {
          username: "u2",
          firstName: "U2F",
          lastName: "U2L",
          email: "user2@user.com",
          isAdmin: false,
        },
        {
          username: "u3",
          firstName: "U3F",
          lastName: "U3L",
          email: "user3@user.com",
          isAdmin: false,
        },
      ],
    });
  });

  test("unauth for anon", async function () {
    const resp = await request(app)
        .get("/users");
    expect(resp.statusCode).toEqual(401);
  });

  test("fails: test next() handler", async function () {
    // there's no normal failure event which will cause this route to fail ---
    // thus making it hard to test that the error-handler works with it. This
    // should cause an error, all right :)
    await db.query("DROP TABLE users CASCADE");
    const resp = await request(app)
        .get("/users")
        .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(500);
  });

  test("route only availabe to users with Admin status" , async function () {
    const resp = await request(app).get('/users').set("authorization" , `Bearer ${u2Token}`)
    expect(resp.statusCode).toEqual(401);
  })
});

/************************************** GET /users/:username */

describe("GET /users/:username", function () {
  test("works for users", async function () {
    const resp = await request(app)
        .get(`/users/u1`)
        .set("authorization", `Bearer ${u1Token}`);
    expect(resp.body).toEqual({
      user: {
        username: "u1",
        firstName: "U1F",
        lastName: "U1L",
        email: "user1@user.com",
        isAdmin: true,
        applications : []
      },
    });
  });

  test("unauth for anon", async function () {
    const resp = await request(app)
        .get(`/users/u1`);
    expect(resp.statusCode).toEqual(401);
  });

  test("not found if user not found", async function () {
    const resp = await request(app)
        .get(`/users/nope`)
        .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(404);
  });

  test("route only available to user with Admin status or a user that is looking up their own information" , async function () {
    const resp = await request(app).get(`/users/u2`).set('authorization' , `Bearer ${u2Token}`);
    expect(resp.statusCode).toEqual(200);
    const badResp = await request(app).get(`/users/u1`).set("authorization" , `Bearer ${u2Token}`);
    expect (badResp.statusCode).toEqual(401);
  })
});

/************************************** PATCH /users/:username */

describe("PATCH /users/:username", () => {
  test("works for users", async function () {
    const resp = await request(app)
        .patch(`/users/u1`)
        .send({
          firstName: "New",
        })
        .set("authorization", `Bearer ${u1Token}`);
    expect(resp.body).toEqual({
      user: {
        username: "u1",
        firstName: "New",
        lastName: "U1L",
        email: "user1@user.com",
        isAdmin: true,
      },
    });
  });

  test("unauth for anon", async function () {
    const resp = await request(app)
        .patch(`/users/u1`)
        .send({
          firstName: "New",
        });
    expect(resp.statusCode).toEqual(401);
  });

  test("not found if no such user", async function () {
    const resp = await request(app)
        .patch(`/users/nope`)
        .send({
          firstName: "Nope",
        })
        .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(404);
  });

  test("bad request if invalid data", async function () {
    const resp = await request(app)
        .patch(`/users/u1`)
        .send({
          firstName: 42,
        })
        .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(400);
  });

  test("works: set new password", async function () {
    const resp = await request(app)
        .patch(`/users/u1`)
        .send({
          password: "new-password",
        })
        .set("authorization", `Bearer ${u1Token}`);
    expect(resp.body).toEqual({
      user: {
        username: "u1",
        firstName: "U1F",
        lastName: "U1L",
        email: "user1@user.com",
        isAdmin: true,
      },
    });
    const isSuccessful = await User.authenticate("u1", "new-password");
    expect(isSuccessful).toBeTruthy();
  });

  test("route only availble to users with Admin status or to a user that is trying to modify their own information" , async function() {
    const resp = await request(app).patch(`/users/u2`).send({
      password : "new-password"
  }).set("authorization" , `Bearer ${u2Token}`);
  const isSuccessful = await User.authenticate("u2" , "new-password");
  expect(isSuccessful).toBeTruthy();
  const badResp = await request(app).patch(`/users/u3`).send({
    password: "new-password"
  }).set("authorization" , `Bearer ${u2Token}`);
  expect(badResp.statusCode).toBe(401);
  })
});

/************************************** DELETE /users/:username */

describe("DELETE /users/:username", function () {
  test("works for users", async function () {
    const resp = await request(app)
        .delete(`/users/u1`)
        .set("authorization", `Bearer ${u1Token}`);
    expect(resp.body).toEqual({ deleted: "u1" });
  });

  test("unauth for anon", async function () {
    const resp = await request(app)
        .delete(`/users/u1`);
    expect(resp.statusCode).toEqual(401);
  });

  test("not found if user missing", async function () {
    const resp = await request(app)
        .delete(`/users/nope`)
        .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(404);
  });
  test("route only available to users with Admin status or to a user that is trying to modify their own information", async function () {
    const resp = await request(app).delete(`/users/u2`).set("authorization" , `Bearer ${u2Token}`);
    expect(resp.statusCode).toEqual(200);
    const badResp = await request(app).delete(`/users/u1`).set("authorization" , `Bearer ${u3Token}`);
    expect(badResp.statusCode).toEqual(401);
  });
});



//  **************************** POST /users/:username/jobs/:id (Apply for a job)


describe('POST works to apply for a job (non-admin)' , function () {
  test('works for user applying for themselves' , async function () {
    const resp = await request(app).post(`/users/u2/jobs/${testJobsId[0]}`).set("authorization" , `Bearer ${u2Token}`);
    expect(resp.statusCode).toBe(200);
    expect(resp.body).toEqual({ applied : `${testJobsId[0]}`} )

    const dbQuery = await db.query(`SELECT * FROM applications WHERE job_id = $1` , [testJobsId[0]]);
    expect(dbQuery.rows).toEqual([{username: 'u2' , job_id : testJobsId[0]}])
  })

  test('works for admin applying for another user' , async function () {
    const resp = await request(app).post(`/users/u2/jobs/${testJobsId[0]}`).set("authorization" , `Bearer ${u1Token}`);
    expect(resp.statusCode).toBe(200);
    expect(resp.body).toEqual({ applied : `${testJobsId[0]}`} )

    const dbQuery = await db.query(`SELECT * FROM applications WHERE job_id = $1` , [testJobsId[0]]);
    expect(dbQuery.rows).toEqual([{username: 'u2' , job_id : testJobsId[0]}])
  })

  test('does not work when user tries applying for another user without Admin privledges' , async function () {
    const resp = await request(app).post(`/users/u1/jobs/${testJobsId[0]}`).set("authorization" , `Bearer ${u2Token}`);
    expect(resp.statusCode).toBe(401);

    const dbQuery = await db.query(`SELECT * FROM applications WHERE job_id = $1` , [testJobsId[0]]);
    expect(dbQuery.rows.length).toBe(0);
  })

  test('error thrown when job_id is invalid' , async function () {
    try{
    const resp = await request(app).post(`/users/u2/jobs/${testJobsId[5]}`).set("authorization" , `Bearer ${u2Token}`);
    }catch(e) {
      expect(e instanceof NotFoundError).toBeTruthy();
    }
  })

  test('error thrown when username is invalid' , async function () {
    try{
      const resp = await request(app).post(`/users/fakeUser/jobs/${testJobsId[0]}`).set("authorization" , `Bearer ${u2Token}`);
    }catch(e) {
      expect(e instanceof NotFoundError).toBeTruthy();
    }
  })
})