"use strict";

const db = require("../db");
const { BadRequestError, NotFoundError, ExpressError } = require("../expressError");
const { sqlForPartialUpdate } = require("../helpers/sql");

/** Related functions for companies. */

class Company {
  /** Create a company (from data), update db, return new company data.
   *
   * data should be { handle, name, description, numEmployees, logoUrl }
   *
   * Returns { handle, name, description, numEmployees, logoUrl }
   *
   * Throws BadRequestError if company already in database.
   * */

  static async create({ handle, name, description, numEmployees, logoUrl }) {
    const duplicateCheck = await db.query(
          `SELECT handle
           FROM companies
           WHERE handle = $1`,
        [handle]);

    if (duplicateCheck.rows[0])
      throw new BadRequestError(`Duplicate company: ${handle}`);

    const result = await db.query(
          `INSERT INTO companies
           (handle, name, description, num_employees, logo_url)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING handle, name, description, num_employees AS "numEmployees", logo_url AS "logoUrl"`,
        [
          handle,
          name,
          description,
          numEmployees,
          logoUrl,
        ],
    );
    const company = result.rows[0];

    return company;
  }

  /** Find all companies.
   *
   * Returns [{ handle, name, description, numEmployees, logoUrl }, ...]
   * */

  static async findAll() {
    const companiesRes = await db.query(
          `SELECT handle,
                  name,
                  description,
                  num_employees AS "numEmployees",
                  logo_url AS "logoUrl"
           FROM companies
           ORDER BY name`);
    return companiesRes.rows;
  }

  /** Given a company handle, return data about company.
   *
   * Returns { handle, name, description, numEmployees, logoUrl, jobs }
   *   where jobs is [{ id, title, salary, equity, companyHandle }, ...]
   *
   * Throws NotFoundError if not found.
   **/

  static async get(handle) {
    const companyRes = await db.query(
          `SELECT handle,
                  name,
                  description,
                  num_employees AS "numEmployees",
                  logo_url AS "logoUrl"
           FROM companies
           WHERE handle = $1`,
        [handle]);

    const company = companyRes.rows[0];

    if (!company) throw new NotFoundError(`No company: ${handle}`);

    return company;
  }

  /** Update company data with `data`.
   *
   * This is a "partial update" --- it's fine if data doesn't contain all the
   * fields; this only changes provided ones.
   *
   * Data can include: {name, description, numEmployees, logoUrl}
   *
   * Returns {handle, name, description, numEmployees, logoUrl}
   *
   * Throws NotFoundError if not found.
   */

  static async update(handle, data) {
    const { setCols, values } = sqlForPartialUpdate(
        data,
        {
          numEmployees: "num_employees",
          logoUrl: "logo_url",
        });
    const handleVarIdx = "$" + (values.length + 1);

    const querySql = `UPDATE companies 
                      SET ${setCols} 
                      WHERE handle = ${handleVarIdx} 
                      RETURNING handle, 
                                name, 
                                description, 
                                num_employees AS "numEmployees", 
                                logo_url AS "logoUrl"`;
    const result = await db.query(querySql, [...values, handle]);
    const company = result.rows[0];

    if (!company) throw new NotFoundError(`No company: ${handle}`);

    return company;
  }

  /** Delete given company from database; returns undefined.
   *
   * Throws NotFoundError if company not found.
   **/

  static async remove(handle) {
    const result = await db.query(
          `DELETE
           FROM companies
           WHERE handle = $1
           RETURNING handle`,
        [handle]);
    const company = result.rows[0];

    if (!company) throw new NotFoundError(`No company: ${handle}`);
  }

// ** Filters companies based on filter params
// ** Filter variable can include any or all of the following: {name , minEmployees , maxEmployees}

  static async filter(filters) {
   const {name , minEmployees , maxEmployees} = filters;
   let filterParams = {}
   if(name){
      filterParams.name = name;
   }
   if(minEmployees){
     filterParams.minEmployees = minEmployees;
   }
   if(maxEmployees){
     filterParams.maxEmployees = maxEmployees
   }
  
   if(filterParams.name && !filterParams.minEmployees && !filterParams.maxEmployees) {
    const results = await db.query(`SELECT handle , name , description , num_employees AS "numEmployees" , logo_url AS "logoUrl" FROM companies WHERE name ILIKE $1` , [`%${filterParams.name}%`])
    const company = results.rows;
    if(results.rows.length === 0) {
      throw new ExpressError("No results, please redefine seach" , 400)
    }
    return company
   }

   if(filterParams.name && filterParams.minEmployees && !filterParams.maxEmployees) {
    const results = await db.query(`SELECT handle , name , description , num_employees AS "numEmployees" , logo_url AS "logoUrl" FROM companies WHERE name ILIKE $1 AND num_employees >= $2 ` , [`%${filterParams.name}%`, filterParams.minEmployees])
    const company = results.rows;
    if(results.rows.length === 0) {
      throw new ExpressError("No results, please redefine seach" , 400)
    }
    return company
   }
   if(filterParams.name && !filterParams.minEmployees && filterParams.maxEmployees) {
    const results = await db.query(`SELECT handle , name , description , num_employees AS "numEmployees" , logo_url AS "logoUrl" FROM companies WHERE name ILIKE $1 AND num_employees <= $2 ` , [`%${filterParams.name}%` , filterParams.maxEmployees])
    const company = results.rows;
    if(results.rows.length === 0) {
      throw new ExpressError("No results, please redefine seach" , 400)
     }
      return company
   }

   if(filterParams.name && filterParams.minEmployees && filterParams.maxEmployees) {
     if(filterParams.minEmployees >= filterParams.maxEmployees){
       throw new ExpressError("Min number must be smaller than max number" , 400)
     }
     const results = await db.query(`SELECT handle , name , description , num_employees AS "numEmployees" , logo_url AS "logoUrl" FROM companies WHERE name ILIKE $1 AND num_employees BETWEEN $2 AND $3` , [`%${filterParams.name}%` , filterParams.minEmployees , filterParams.maxEmployees])
     const company = results.rows;
     if(results.rows.length === 0) {
      throw new ExpressError("No results, please redefine seach" , 400)
      }
       return company
   }

   if(!filterParams.name && filterParams.minEmployees && filterParams.maxEmployees) {
    if(filterParams.minEmployees >= filterParams.maxEmployees){
      throw new ExpressError("Min number must be smaller than max number" , 400)
    }
    const results = await db.query(`SELECT handle, name , description , num_employees AS "numEmployees" , logo_url AS "logoUrl" FROM companies WHERE num_employees BETWEEN $1 AND $2` , [filterParams.minEmployees , filterParams.maxEmployees])
    const company = results.rows;
    if(results.rows.length === 0) {
      throw new ExpressError("No results, please redefine seach" , 400)
    }
    return company
   }

   if(!filterParams.name && !filterParams.minEmployees && filterParams.maxEmployees){
    const results = await db.query(`SELECT handle, name , description , num_employees AS "numEmployees" , logo_url AS "logoUrl" FROM companies WHERE num_employees <= $1` , [filterParams.maxEmployees])
    const company = results.rows;
    if(results.rows.length === 0) {
      throw new ExpressError("No results, please redefine seach" , 400)
   
   }
   return company
  }

   if(!filterParams.name && filterParams.minEmployees && !filterParams.maxEmployees){
    const results = await db.query(`SELECT handle, name , description , num_employees AS "numEmployees" , logo_url AS "logoUrl" FROM companies WHERE num_employees >= $1` , [filterParams.minEmployees])
    const company = results.rows;
    if(results.rows.length === 0) {
      throw new ExpressError("No results, please redefine seach" , 400)
    
   }
   return company
  }
}
}





module.exports = Company;