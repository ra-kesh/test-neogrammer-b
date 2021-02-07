const express = require('express');
const router = express.Router();
const { contactForm, contactProjectAuthorForm } = require('../controllers/form');

// validators
const { runValidation } = require('../validators');
const { contactFormValidator } = require('../validators/form');

router.post('/contact', contactFormValidator, runValidation, contactForm);
router.post('/contact-project-author', contactFormValidator, runValidation, contactProjectAuthorForm);

module.exports = router;