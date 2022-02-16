"use strict";

const request = require("supertest");

const db = require("../db");
const app = require("../app");

const {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
  u1Token,
  u2Token
} = require("./_testCommon");
const { BadRequestError, NotFoundError } = require("../expressError");



beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);




// ************************* Post /jobs
// This route requires Admin status
// 

describe('POST /jobs' , function () {
    const newJob = {
        title: 'test_1',
        salary: 100,
        equity: '0',
        company_handle: 'c1'
    }

    test('route only avalable for users with Admn status' , async function () {
        const resp = await request(app).post('/jobs').send(newJob).set("authorization" , `Bearer ${u1Token}`);
        expect(resp.statusCode).toBe(201);
        // expect(resp.body).toEqual({
        //     job: newJob
        // });
        const results = await db.query(`SELECT title, salary, equity, company_handle FROM jobs WHERE title ='test_1'`);
        expect(results.rows[0]).toEqual(newJob)
    })

    test('route not available to user with Non-Admin status' , async function () {
        const resp = await request(app).post('/jobs').send(newJob).set("authorization" , `Bearer ${u2Token}`);
        expect(resp.statusCode).toBe(401);
    })

    test('bad request with missing data' , async function () {
        const resp = await request(app).post('/jobs').send({
            title: 'bad_test'
        }).set("authorization" , `Bearer ${u1Token}`);
        expect(resp.statusCode).toEqual(400);
    })

    test('bad reqeust with invalid data' , async function () {
        const resp = await request(app).post('/jobs').send({
            title: 'test_2',
            salary: "100",
            equity: '0',
            company_handle: 'c1'
        }).set('authorization' , `Bearer ${u1Token}`);
        expect(resp.statusCode).toBe(400);
    })
})


// **************************findAll

describe('/Get all jobs' ,  function() {
    test('gets all jobs' , async function() {
        const jobs = await request(app).get('/jobs');
        expect(jobs.body).toEqual({
            jobs:
            [
                {
                    title : 'j1',
                    salary: 100,
                    equity: '0',
                    company_handle: 'c1'
                },
                {
                    title: 'j2',
                    salary : 100,
                    equity : '0.01',
                    company_handle: 'c1'
                },
                {
                    title: 'j3',
                    salary: 100,
                    equity : '0',
                    company_handle: 'c2'
                },
                {
                    title: 'j4',
                    salary: 100,
                    equity: '0.001',
                    company_handle: 'c2'
                },
            ],
        })
    })

    test('filter job works with all params' , async function () {
        const job = await request(app).get('/jobs').send({
            title: 'j4',
            minSalary: 100,
            hasEquity: true
        });
        expect(job.body).toEqual(
            [
                {
                    title: 'j4',
                    salary: 100,
                    equity : '0.001',
                    company_handle: 'c2'
                }
            ]
        )

    })

    test('filter job works wihtout minSalary' , async function () {
        const job = await request(app).get('/jobs').send({
            title: 'j1',
            hasEquity: false
        });
        expect(job.body).toEqual(
           [
                {
                    title: 'j1',
                    salary: 100,
                    equity : '0',
                    company_handle: 'c1'
                }
            ]
        )
    })

    test('filter job works without a title' , async function () {
        const job =  await request(app).get('/jobs').send({
            minSalary: 100,
            hasEquity: true
        });
        expect(job.body).toEqual(
            [
                {
                    title: 'j2',
                    salary: 100,
                    equity: '0.01',
                    company_handle: 'c1'
                },
                {
                    title: 'j4',
                    salary: 100,
                    equity: '0.001',
                    company_handle: 'c2'
                }
            ]
        )
    })

    test('fitler works without title or minSalary' , async function () {
        const job = await request(app).get('/jobs').send({
            hasEquity: true 
        });
        expect(job.body).toEqual(
            [
                {
                    title: 'j2',
                    salary: 100,
                    equity: '0.01',
                    company_handle: 'c1'
                },
                {
                    title: 'j4',
                    salary: 100,
                    equity: '0.001',
                    company_handle: 'c2'
                }
            ]
        )
    })
    
    test('error thrown when invalid data is given' , async function () {
        const job = await request(app).get('/jobs').send({
            title: 'fake_job'   
        });
        expect(job.statusCode).toBe(404);
    })
})


//  **************************** Update Jobs

describe('/Patch  updates a job' , function () {
    const jobUpdateData = {
        title : 'updatedJobTitle' ,
        salary : 500
    }
    const badJobUpdate = {
        title: "badJob",
        salary : "invalid salary string"
    }
    test('updates a job' , async function () {
        const resp = await request(app).patch('/jobs/j1/c1').send(jobUpdateData).set("authorization" , `Bearer ${u1Token}`);
        expect(resp.body).toEqual({
            job : {
            title: 'updatedJobTitle',
            salary: 500,
            equity : '0',
            company_handle : 'c1'
            }
        })
        const queryResp = await db.query(`SELECT title , salary , equity , company_handle FROM jobs WHERE title = 'updatedJobTitle'`);
        expect(queryResp.rows[0]).toEqual({
            title: 'updatedJobTitle' ,
            salary : 500 ,
            equity: '0',
            company_handle: 'c1'
        })
    })

    test('Admin status needed to update a job' , async function () {
        const job = await request(app).patch('/jobs/j1/c1').send(jobUpdateData).set("authorization" , `Bearer ${u2Token}`);
        expect(job.statusCode).toBe(401);
    })

    test('Error thrown if company does not have the requested job title' , async function () {
        const job = await request(app).patch('/jobs/j7/c1').send(jobUpdateData).set("authorization" , `Bearer ${u1Token}`);
        expect(job.statusCode).toBe(404);
        expect(job.body).toEqual({
            error: {
                message: 'No job : j7 for company c1',
                status: 404
            }
        })
    })
    
    test('Error thrown if company does not exist' , async function () {
        try{
        await request(app).patch('/jobs/j1/wrong').send(jobUpdateData).set("authorization" , `Bearer ${u1Token}`);
        }catch(e){
        expect(e instanceof BadRequestError).toBeTruthy();
        }
    })

    test('bad request with invalid data' , async function () {
        const job = await request(app).patch('/jobs/j1/c1').send(badJobUpdate).set("authorization" , `Bearer ${u1Token}`);
        expect(job.statusCode).toBe(400);
    })

    test('bad request with company handle change' , async function() {
        const job = await request(app).patch('/jobs/j1/c1').send({
            handle : 'c1-new'
        }).set("authorization" , `Bearer ${u1Token}`);

        expect(job.statusCode).toBe(400);
    })
})


//  ********************** Delete

describe('/Delete removes an exisiting job' , function () {
    test('deletes an exisitng job' , async function () {
        const job = await request(app).delete('/jobs/j1/c1').set("authorization" , `Bearer ${u1Token}`)
        expect(job.statusCode).toBe(200);
        const dbQuery = await db.query(`SELECT * FROM jobs WHERE title = 'j1' AND company_handle = 'c1'`)
        expect(dbQuery.rows.length).toBe(0);
    })
    test('admin status needed to delete a job' , async function () {
        const job = await request(app).delete('/jobs/j1/c1');
        expect(job.statusCode).toBe(401);
    })
    test('returns a NotFoundError with invalid data' , async function () {
        try{
        const job = await request(app).delete('/jobs/j7/c1').set("authorization" , `Bearer ${u1Token}`);
        }catch(e) {
            expect(e instanceof NotFoundError).toBeTruthy();
        }
    
    })
})