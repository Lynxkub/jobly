"use strict";

/** Routes for jobs. */

const jsonschema = require("jsonschema");
const express = require("express");

const { BadRequestError } = require("../expressError");
const { ensureLoggedIn , checkAdmin } = require("../middleware/auth");
const Job = require('../models/job');

const jobNewSchema = require('../schemas/jobNew.json');
const jobUpdateSchema = require('../schemas/jobUpdate.json')
const router = new express.Router();



// * Post / { job } => { job }
// *
// * job should be { title , salary , equity , company_handle }
// *
// * Returns { title , salary , equity , company_handle }
// *
// * Authorization required : login , Admin status
// *


router.post('/' , ensureLoggedIn , checkAdmin , async function (req , res , next) {
    try{
        const validator  = jsonschema.validate(req.body , jobNewSchema);
        if(!validator.valid) {
            const errs = validator.errors.map(e => e.stack);
            throw new BadRequestError(errs);
        }

        const job = await Job.create(req.body);
        return res.status(201).json({ job });
    }catch (e) {
        return next(e);
    }
})

// * GET / Finds all jobs 

// * Returns { title , salary , equity , company_handle}

// * User able to filter for a job

// * Filter can include { title , minSalary , hasEquity }

// * Authorization required : none 

router.get('/' , async function (req , res , next) {
    try{
        if(req.body.title || req.body.minSalary || req.body.hasEquity) {
            const jobFilter = await Job.filter(req.body);
            return res.json(jobFilter);
        }else {
        const jobs = await Job.findAll();
        return res.json({jobs});
        }
    }catch(e){
        return next(e);
    }
})

router.patch('/:title/:company_handle' , ensureLoggedIn , checkAdmin , async function (req , res , next) {
    try {
        const validator = jsonschema.validate(req.body , jobUpdateSchema);
        if(!validator.valid) {
            const err = validator.errors.map(e => e.stack);
            throw new BadRequestError(err);
        }

        const job = await Job.update(req.params.title , req.params.company_handle , req.body);
        return res.json({ job });
    }catch(e) {
        return next(e);
    }
})

// * DELETE / Deletes an exisitng job
// *
// * Authorization required : Admin
// *

router.delete('/:title/:company_handle' , ensureLoggedIn , checkAdmin , async function( req , res , next) {
    try{
        const job = await Job.remove(req.params.title , req.params.company_handle);
        return res.json({msg: 'deleted'})
    }catch(e){
        return next(e);
    }
})














module.exports = router;