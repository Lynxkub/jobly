"use strict";

const { database } = require("pg/lib/defaults");
const db = require("../db");
const { BadRequestError, NotFoundError, ExpressError } = require("../expressError");
const { sqlForPartialUpdate } = require("../helpers/sql");

/** Related functions for jobs. */


class Job {
// *Create a new job, update the db, return new job data 
// *
// *data should be { title , salary , equity , company_handle (foreign key from *company table)}
// *
// *Returns { title , salary , equity , company_handle}
// *
// *Throws BadRequestError if company_handle is not valid/exisitng

static async create({title , salary , equity , company_handle}) {
    const validHandleCheck = await db.query(`SELECT handle FROM companies WHERE handle = $1` , [company_handle])

    if(!validHandleCheck.rows[0]){
        throw new BadRequestError(`Company (${company_handle}) does not exist`)
    }
    const results = await db.query(`INSERT INTO jobs(title , salary , equity , company_handle) VALUES ($1 ,$2 ,$3 ,$4) RETURNING id ,title , salary , equity , company_handle` , [title , salary , equity , company_handle]);
    
    const job = results.rows[0];

    return job;
}

// *Gets all jobs
// * Returns [{title , salary , equity , company_handle}]
// *
// *

static async findAll() {
    const jobsRes = await db.query(
        `SELECT title, salary , equity , company_handle
        FROM jobs
        ORDER BY company_handle`
    )
    return jobsRes.rows;
}


// * Updates a job
// *
// *Partial update for an existing job
// *
// *Data can include { title , salary , equity }
// *
// *Returns {title, salary , equity , company_hanle}


static async update(title , company_handle , data){
    const {setCols , values } = sqlForPartialUpdate(
        data ,
        {
            title: "title",
            salary: "salary" ,
            equity: "equity"
        }
    );
    const handlVarIdx = "$" + (values.length +1);
    const titleVarIdx = "$" + (values.length +2);
    const querySql = `UPDATE jobs SET ${setCols} WHERE company_handle = ${handlVarIdx} AND title = ${titleVarIdx} RETURNING title , salary , equity , company_handle`;

    const result = await db.query(querySql , [...values , company_handle , title])
    const job = result.rows[0];

    if(!job) throw new NotFoundError(`No job : ${title} for company ${company_handle}`)

    return job;
}

// * Deletes a job
// *
// *Throws a NotFoundError if job is not found


static async remove(title , company_handle) {
    const doesJobExist = await db.query(`SELECT * FROM jobs WHERE title = $1 AND company_handle = $2` , [title , company_handle])
    if(!doesJobExist) {
        throw new NotFoundError(`No job : ${title} for company ${company_handle}`);}
   await db.query(`DELETE FROM jobs WHERE title = $1 AND company_handle = $2` , [title , company_handle]);
}


// * FIlters a job based on query
// * 
// * Can accept { title , minSalary , hasEquity(true or false) }
// *
// * Returns { title , salary , equity , company_handle}
// *


static async filter(filters) {
    const { title , minSalary , hasEquity } = filters;

    let filterParams = {};
    if(title) {
        filterParams.title = title;
    }
    if (minSalary) {
        filterParams.minSalary = minSalary;
    }
    if(hasEquity) {
        filterParams.hasEquity = hasEquity;
    }
    if(filterParams.title && filterParams.minSalary && filterParams.hasEquity === true) {
        const results = await db.query(`SELECT title , salary , equity , company_handle FROM jobs WHERE title ILIKE $1 AND salary >= $2 AND equity > 0` , [filterParams.title , filterParams.minSalary]);
        const job = results.rows;
        if (results.rows.length === 0) {
            throw new NotFoundError('No results , please redefine search' , 400);
        };
        return job;
    }

    if(filterParams.title && filterParams.minSalary && !filterParams.hasEquity) {
        const results = await db.query(`SELECT title , salary , equity , company_handle FROM jobs WHERE title ILIKE $1 AND salary >= $2 AND equity = '0'` , [filterParams.title , filterParams.minSalary]);
        const job = results.rows;
        if (results.rows.length === 0) {
            throw new NotFoundError('No results , please redefine search' , 400);
        };
        return job;
    }

    if(filterParams.title && !filterParams.minSalary && filterParams.hasEquity === true) {
        const results = await db.query(`SELECT title , salary , equity , company_handle FROM jobs WHERE title ILIKE $1  AND equity > 0` , [filterParams.title]);
        const job = results.rows;
        if (results.rows.length === 0) {
            throw new NotFoundError('No results , please redefine search' , 400);
        };
        return job;
    }

    if(filterParams.title && !filterParams.minSalary && !filterParams.hasEquity ) {
        const results = await db.query(`SELECT title , salary , equity , company_handle FROM jobs WHERE title ILIKE $1 AND equity = 0` , [filterParams.title]);
        const job = results.rows;
        if (results.rows.length === 0) {
            throw new NotFoundError('No results , please redefine search' , 400);
        };
        return job;
    }

    if(!filterParams.title && filterParams.minSalary && filterParams.hasEquity === true) {
        const results = await db.query(`SELECT title , salary , equity , company_handle FROM jobs WHERE salary >= $1 AND equity > 0` , [ filterParams.minSalary]);
        const job = results.rows;
        if (results.rows.length === 0) {
            throw new NotFoundError('No results , please redefine search' , 400);
        };
        return job;
    }

    if(!filterParams.title && filterParams.minSalary && !filterParams.hasEquity) {
        const results = await db.query(`SELECT title , salary , equity , company_handle FROM jobs WHERE salary >= $1 AND equity = 0` , [filterParams.minSalary]);
        const job = results.rows;
        if (results.rows.length === 0) {
            throw new NotFoundError('No results , please redefine search' , 400);
        };
        return job;
    }

    if(!filterParams.title && !filterParams.minSalary && filterParams.hasEquity === true) {
        const results = await db.query(`SELECT title , salary , equity , company_handle FROM jobs WHERE  equity > 0`);
        const job = results.rows;
        if (results.rows.length === 0) {
            throw new NotFoundError('No results , please redefine search' , 400);
        };
        return job;
    }

}

// * Finds jobs filtered by a specific company
// * 
// *

static async get(company_handle) {
    const company = company_handle
    const results = await db.query(`SELECT title , salary , equity , company_handle FROM jobs WHERE company_handle = $1 ` , [company])
    return results.rows;
}

}


module.exports = Job