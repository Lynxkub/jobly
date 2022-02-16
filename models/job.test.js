"use strict";

const db = require("../db.js");
const { BadRequestError, NotFoundError } = require("../expressError");
const Job = require("./job.js");
const { findAll } = require("./user.js");
const {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
  testJobsId
} = require("./_testCommon");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

// ****************************************** create */
describe("create" , function () {
    const newJob = {
        title : "test",
        salary: 100,
        equity: "0",
        company_handle: "c1",
        
        
    }
    const badJob = {
        title: "bad_test",
        salary: 100,
        equity : "0",
        company_handle: "bad_handle"
    }

    test("works" , async function() {
        let job = await Job.create(newJob);
        

        const results = await db.query(`SELECT title, salary , equity , company_handle FROM jobs WHERE company_handle = 'c1'`);
        expect(results.rows).toEqual([
            {
            title: "test",
            salary: 100,
            equity: "0",
            company_handle: "c1"
            }
        ])
    })

    test("bad request when a company does not exist" , async function () {
        try{
            await Job.create(badJob);
            fail();
        }catch(e) {
            expect(e instanceof BadRequestError).toBeTruthy();
        };
    });
});

// *****************************findALL
describe('find all jobs in the db' , function () {
    test('works' , async function () {
        const jobs = await Job.findAll();
        expect(jobs).toEqual([{title : 'j2' ,salary: 100 , equity: '0.8' , company_handle: 'c2'} ,{title: 'j1' ,salary: 100, equity: '0',company_handle: 'c3'}])
    })
})



// ******************** Update
describe('updates an exisiting job' , function () {
    const jobUpdateData = {
        title : 'updatedTitle',
        salary: 500
    }
    test('works' , async function () {
        const jobUpdate = await Job.update('j1' , 'c3' , jobUpdateData);
        expect(jobUpdate).toEqual({
            title: 'updatedTitle',
            salary: 500,
            equity : '0',
            company_handle : 'c3'
        })
        const results = await db.query(`SELECT title , salary , equity, company_handle FROM jobs WHERE title = 'updatedTitle' and company_handle = 'c3'`)
        expect(results.rows).toEqual([{
            title: 'updatedTitle',
            salary: 500,
            equity: '0',
            company_handle : 'c3'
        }])
    })
    test('not found if company_handle does not exist' , async function() {
        try {
            await Job.update('j1' , 'nope' , jobUpdateData);
        }catch(e) {
            expect(e instanceof NotFoundError).toBeTruthy();
        }
    })
    test('not found if title does not exist with a valid company_handle' , async function () {
        try {
            await Job.update('badTitle' , 'c1' , jobUpdateData);
        }catch (e) {
            expect(e instanceof NotFoundError).toBeTruthy();
        }
    })
})


// ********************** Delete

describe('deletes an existing job' , function () {
    test('works' , async function () {
        const job = await Job.remove('j1' , 'c3');
        
        const deleteQuery = await db.query(`SELECT title , salary , equity , company_handle FROM jobs WHERE title = 'j1' AND company_handle = 'c3'`);
        expect(deleteQuery.rows.length).toEqual(0);
    })

    test('NotFoundError thrown if job does not exist' , async function () {
        try {
             await Job.remove('fake' , 'c3');
        }catch (e) {
            expect(e instanceof NotFoundError).toBeTruthy();
        }
        
        
    })
}
)



// ************************** Filter

describe('filtered search for a job' , function() {
    test('works with all 3 params' , async function () {
      const reqBody = {
          title: 'j2',
          minSalary: 100,
          hasEquity : true
      };
      const res = await Job.filter(reqBody);
      expect(res).toEqual([{
          title: 'j2',
          salary: 100,
          equity: '0.8',
          company_handle: 'c2'
      }])
    })

    test('works for query for job without equity' , async function() {
        const reqBody = {
            title: 'j1',
            minSalary: 100,
            hasEquity : false
        };
        const res = await Job.filter(reqBody)
        expect(res).toEqual([{
            title: 'j1',
            salary: 100,
            equity: '0',
            company_handle: 'c3'
        }])
    })

    test('works for query for job wihtout title' , async function () {
        const reqBody = {
            minSalary: 100,
            hasEquity : false
        };
        const res = await Job.filter(reqBody);
        expect(res).toEqual([{
            title : 'j1',
            salary: 100,
            equity: '0',
            company_handle: 'c3'
        }])
    })

    test('works for a query for a job without minSalary' , async function () {
        const reqBody = {
            title: 'j1',
            hasEquity : false
        };
        const res = await Job.filter(reqBody);
        expect(res).toEqual([{
            title : 'j1',
            salary: 100,
            equity: '0',
            company_handle: 'c3'
        }])
    })

    test('throws error if no job exists' , async function () {
        try{
        const reqBody = {
        title : 'j7',
        minSalary: 500,
        }
        const res = await Job.filter(reqBody);
    }catch (e){
        expect(e instanceof NotFoundError).toBeTruthy();
    }
    })

    test('works for a query with only hasEquity' , async function () {
        const reqBody = {
            hasEquity : true
        };
        const res = await Job.filter(reqBody);
        expect(res).toEqual([{
            title: 'j2',
            salary : 100,
            equity : '0.8',
            company_handle: 'c2'
        }])
    })
})


describe('get jobs associated with a company' , function () {
    test('works' , async function () {
        const results = await Job.get('c3');
        expect(results).toEqual([{
            title: 'j1',
            salary: 100,
            equity: '0',
            company_handle: 'c3'
        }])
    })
})