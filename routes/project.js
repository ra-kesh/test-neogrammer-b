const express = require('express');
const router = express.Router();
const { create, list, listAllProjectsCategoriesTags, read, remove, update , photo , listRelated , listSearch , listByUser} = require('../controllers/project');

const { requireSignin, adminMiddleware , authMiddleware , canUpdateDeleteProject } = require('../controllers/auth');

router.post('/project', requireSignin, adminMiddleware, create);
router.get('/projects', list);
router.post('/projects-categories-tags', listAllProjectsCategoriesTags);
router.get('/project/:slug', read);
router.delete('/project/:slug', requireSignin, adminMiddleware, remove);
router.put('/project/:slug', requireSignin, adminMiddleware, update);
router.get('/project/photo/:slug', photo);
router.post('/projects/related', listRelated);
router.get('/projects/search', listSearch);


// auth user project crud
router.post('/user/project', requireSignin, authMiddleware, create);
router.get('/:username/projects', listByUser);
router.delete('/user/project/:slug', requireSignin, authMiddleware, canUpdateDeleteProject ,remove);
router.put('/user/project/:slug', requireSignin, authMiddleware, canUpdateDeleteProject , update);

module.exports = router;