const Project = require('../models/project');
const Category = require('../models/category');
const Tag = require('../models/tag');
const User = require('../models/user');
const formidable = require('formidable');
const slugify = require('slugify');
const stripHtml = require('string-strip-html');
const _ = require('lodash');
const { errorHandler } = require('../helpers/dbErrorHandler');
const fs = require('fs');
const { smartTrim } = require('../helpers/project');

exports.create = (req, res) => {
    let form = new formidable.IncomingForm();
    form.keepExtensions = true;
    form.parse(req, (err, fields, files) => {
        if (err) {
            return res.status(400).json({
                error: 'Image could not upload'
            });
        }

        const { title, body, categories, tags } = fields;

        if (!title || !title.length) {
            return res.status(400).json({
                error: 'title is required'
            });
        }

        if (!body || body.length < 50) {
            return res.status(400).json({
                error: 'Content is too short'
            });
        }

        if (!categories || categories.length === 0) {
            return res.status(400).json({
                error: 'At least one category is required'
            });
        }

        if (!tags || tags.length === 0) {
            return res.status(400).json({
                error: 'At least one tag is required'
            });
        }

        let project = new Project();
       project.title = title;
       project.body = body;
       project.excerpt = smartTrim(body, 100, ' ', ' ...');
       project.slug = slugify(title).toLowerCase();
       project.mtitle = `${title} | ${process.env.APP_NAME}`;
       project.mdesc = stripHtml(body.substring(0, 50));
       project.postedBy = req.user._id;

    // categories and tags
    let arrayOfCategories = categories && categories.split(',');
    let arrayOfTags = tags && tags.split(',');


        if (files.photo) {
            if (files.photo.size > 5000000) {
                return res.status(400).json({
                    error: 'Image should be less then 500kb in size'
                });
            }
           project.photo.data = fs.readFileSync(files.photo.path);
           project.photo.contentType = files.photo.type;
        }

       project.save((err, result) => {
            if (err) {
                return res.status(400).json({
                    error: errorHandler(err)
                });
            }
            // res.json(result);
           Project.findByIdAndUpdate(result._id, { $push: { categories: arrayOfCategories } }, { new: true }).exec(
                (err, result) => {
                    if (err) {
                        return res.status(400).json({
                            error: errorHandler(err)
                        });
                    } else {
                       Project.findByIdAndUpdate(result._id, { $push: { tags: arrayOfTags } }, { new: true }).exec(
                            (err, result) => {
                                if (err) {
                                    return res.status(400).json({
                                        error: errorHandler(err)
                                    });
                                } else {
                                    res.json(result);
                                }
                            }
                        );
                    }
                }
            );
        });
    });
};


// list, listAllProjectsCategoriesTags, read, remove, update

exports.list = (req, res) => {
    Project.find({})
        .populate('categories', '_id name slug')
        .populate('tags', '_id name slug')
        .populate('postedBy', '_id name username')
        .select('_id title slug excerpt categories tags postedBy createdAt updatedAt')
        .exec((err, data) => {
            if (err) {
                return res.json({
                    error: errorHandler(err)
                });
            }
            res.json(data);
        });
};

exports.listAllProjectsCategoriesTags = (req, res) => {

        let limit = req.body.limit ? parseInt(req.body.limit) : 10;
        let skip = req.body.skip ? parseInt(req.body.skip) : 0;
    
        let projects;
        let categories;
        let tags;
    
       Project.find({})
            .populate('categories', '_id name slug')
            .populate('tags', '_id name slug')
            .populate('postedBy', '_id name username profile')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .select('_id title slug excerpt categories tags postedBy createdAt updatedAt')
            .exec((err, data) => {
                if (err) {
                    return res.json({
                        error: errorHandler(err)
                    });
                }
                projects = data; // projects
                // get all categories
                Category.find({}).exec((err, c) => {
                    if (err) {
                        return res.json({
                            error: errorHandler(err)
                        });
                    }
                    categories = c; // categories
                    // get all tags
                    Tag.find({}).exec((err, t) => {
                        if (err) {
                            return res.json({
                                error: errorHandler(err)
                            });
                        }
                        tags = t;
                        // return all projects categories tags
                        res.json({ projects, categories, tags, size: projects.length });
                    });
                });
            });

};

exports.read = (req, res) => {
    const slug = req.params.slug.toLowerCase();
   Project.findOne({ slug })
        .populate('categories', '_id name slug')
        .populate('tags', '_id name slug')
        .populate('postedBy', '_id name username')
        .select('_id title body slug mtitle mdesc categories tags postedBy createdAt updatedAt')
        .exec((err, data) => {
            if (err) {
                return res.json({
                    error: errorHandler(err)
                });
            }
            res.json(data);
        });
};

exports.remove = (req, res) => {
    const slug = req.params.slug.toLowerCase();
   Project.findOneAndRemove({ slug }).exec((err, data) => {
        if (err) {
            return res.json({
                error: errorHandler(err)
            });
        }
        res.json({
            message: 'Project deleted successfully'
        });
    });
};
exports.update = (req, res) => {
    const slug = req.params.slug.toLowerCase();

   Project.findOne({ slug }).exec((err, oldProject) => {
        if (err) {
            return res.status(400).json({
                error: errorHandler(err)
            });
        }

        let form = new formidable.IncomingForm();
        form.keepExtensions = true;

        form.parse(req, (err, fields, files) => {
            if (err) {
                return res.status(400).json({
                    error: 'Image could not upload'
                });
            }

            let slugBeforeMerge = oldProject.slug;
            oldProject = _.merge(oldProject, fields);
            oldProject.slug = slugBeforeMerge;

            const { body, desc, categories, tags } = fields;

            if (body) {
                oldProject.excerpt = smartTrim(body, 100, ' ', ' ...');
                oldProject.desc = stripHtml(body.substring(0, 160));
            }

            if (categories) {
                oldProject.categories = categories.split(',');
            }

            if (tags) {
                oldProject.tags = tags.split(',');
            }

            if (files.photo) {
                if (files.photo.size > 5000000) {
                    return res.status(400).json({
                        error: 'Image should be less then 500kb in size'
                    });
                }
                oldProject.photo.data = fs.readFileSync(files.photo.path);
                oldProject.photo.contentType = files.photo.type;
            }

            oldProject.save((err, result) => {
                if (err) {
                    return res.status(400).json({
                        error: errorHandler(err)
                    });
                }
                // result.photo = undefined;
                res.json(result);
            });
        });
    });
};


exports.photo = (req, res) => {
    const slug = req.params.slug.toLowerCase();
    Project.findOne({ slug })
        .select('photo')
        .exec((err, project) => {
            if (err || !project) {
                return res.status(400).json({
                    error: errorHandler(err)
                });
            }
            res.set('Content-Type', project.photo.contentType);
            return res.send(project.photo.data);
        });
};

exports.listRelated = (req, res) => {
    let limit = req.body.limit ? parseInt(req.body.limit) : 3;
    const { _id, categories } = req.body.project;

    Project.find({ _id: { $ne: _id }, categories: { $in: categories } })
        .limit(limit)
        .populate('postedBy', '_id name username profile')
        .select('title slug excerpt postedBy createdAt updatedAt')
        .exec((err, projects) => {
            if (err) {
                return res.status(400).json({
                    error: 'projects not found'
                });
            }
            res.json(projects);
        });
};

exports.listSearch = (req, res) => {
    const { search } = req.query;
    if (search) {
        Project.find(
            {
                $or: [{ title: { $regex: search, $options: 'i' } }, { body: { $regex: search, $options: 'i' } }]
            },
            (err, projects) => {
                if (err) {
                    return res.status(400).json({
                        error: errorHandler(err)
                    });
                }
                res.json(projects);
            }
        ).select('-photo -body');
    }
};

exports.listByUser = (req, res) => {
    User.findOne({ username: req.params.username }).exec((err, user) => {
        if (err) {
            return res.status(400).json({
                error: errorHandler(err)
            });
        }
        let userId = user._id;
        Project.find({ postedBy: userId })
            .populate('categories', '_id name slug')
            .populate('tags', '_id name slug')
            .populate('postedBy', '_id name username')
            .select('_id title slug postedBy createdAt updatedAt')
            .exec((err, data) => {
                if (err) {
                    return res.status(400).json({
                        error: errorHandler(err)
                    });
                }
                res.json(data);
            });
    });
};