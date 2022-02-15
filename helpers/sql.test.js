const request = require('supertest');

const app = require('../app');

const User = require('../models/user.js');
const Company = require('../models/company');
const {
    commonBeforeAll,
    commonBeforeEach,
    commonAfterEach,
    commonAfterAll
} = require('../models/_testCommon');


beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);


describe('Testing sqlForPartialUpdate works' , function () {
    test('works for user' , async function () {
        const u = await User.update('u1' , {firstName:'U5F' , lastName : 'U5L' , password : 'password1'});
        
        expect(u).toEqual({firstName: 'U5F' , lastName: 'U5L' , email: 'u1@email.com' , isAdmin : false , username : 'u1'})
    })
    test('works for company' , async function () {
        const c = await Company.update('c1' , {name : 'C5' , numEmployees: 50});
        expect(c).toEqual({handle: 'c1' , name: 'C5' , numEmployees: 50, logoUrl:'http://c1.img' , description: 'Desc1'})
    })
})