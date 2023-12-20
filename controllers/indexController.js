const express = require('express');
const bcrypt = require("bcryptjs");
const router = express.Router();
const User = require('../models/user')
const Question = require('../models/question')
const checkAuth = require('../middleware/checkAuth');
const checkAdmin = require('../middleware/checkAdmin');
// trang chủ
router.get('/', (req, res) => {
    res.render('index');
});
// Liên hệ
router.get('/contact', (req, res) => {
    res.render('contact');
});
// Xử lý đăng nhập + đăng ký + đăng xuất
router.get('/login', (req, res) => {
    let error = req.session.error;
    delete req.session.error;
    if (req.session.user) {
        return res.redirect("/dashboard");
    }
    res.render('login', { error, email: '' });
});
router.get('/register', (req, res) => {
    res.render('register', { error: '', email: '', username: '' });
});
router.get('/logout', (req, res) => {
    req.session.destroy((error) => {
        if (error) {
            throw error;
        }
        res.redirect("/");
    });
});
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) {
            req.session.error = "Thông tin đăng nhập không đúng.";
            return res.redirect("/login");
        }
        const hasUser = await bcrypt.compare(password, user.password);
        if (!hasUser) {
            req.session.error = "Thông tin đăng nhập không đúng.";
            return res.redirect("/login");
        }
        req.session.user = user;
        res.redirect("/dashboard");
    } catch (error) {
        console.error(error);
        res.redirect('/login', { error: 'Email hoặc mật khẩu không đúng', email });
    }
});
router.post('/register', async (req, res) => {
    const { username, email, password } = req.body;
    try {
        // Kiểm tra đăng nhập
        let user = await User.findOne({ email, password });
        if (user) {
            return res.render('/register', { error: 'Nguời dùng đã tồn tại', email });
        }
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        user = new User({
            username,
            email,
            password: hashedPassword
        });
        await user.save();
        res.redirect("/login");
    } catch (error) {
        res.redirect('/register', { error: 'Có lỗi xảy ra khi đăng ký', email });
    }
});
// xử lý trang quản lý
router.get('/dashboard', checkAuth, async (req, res) => {
    const username = req.session.user.name;
    const role = req.session.user.role;
    const error = req.session.error;
    const success = req.session.success;
    const questions = role == 'admin' ? await Question.find({}).populate('user_id').exec()
        .then(questions => {
            // Định dạng trường time_stamp cho mỗi câu hỏi
            const formattedQuestions = questions.map(question => {
                return {
                    ...question._doc,
                    time_stamp: question.time_stamp.toLocaleString('vi-VN'),
                };
            });
            return formattedQuestions;
        })
        : await Question.find({ user_id: req.session.user._id }).populate('user_id').exec()
            .then(questions => {
                // Định dạng trường time_stamp cho mỗi câu hỏi
                const formattedQuestions = questions.map(question => {
                    return {
                        ...question._doc,
                        time_stamp: question.time_stamp.toLocaleString('vi-VN'),
                    };
                });
                return formattedQuestions;
            });

    delete req.session.error;
    delete req.session.success;
    res.render("dashboard", { questions: questions, username: username, role: role, error: error, success: success });
});
// xem chi tiết câu hỏi
router.get('/questions/:id', checkAuth, async (req, res) => {
    const id = req.params.id;
    const question = await Question.findOne({ _id: id }).populate('user_id');
    res.render("view", { question: question });
});
router.post('/questions/delete/:id', checkAuth, checkAdmin, async (req, res) => {
    const id = req.params.id;
    try {
        await Question.deleteOne({ _id: id });
        req.session.success = true
    } catch (err) {
        req.session.error = true
    }
    res.redirect("/dashboard");
});
router.post('/questions', checkAuth, async (req, res) => {
    let { question, correct_answers, answers, type } = req.body;
    question = new Question({
        question,
        correct_answers: correct_answers.split(','),
        answers: answers.split(','),
        type,
        user_id: req.session.user._id
    });
    try {
        await question.save();
        req.session.success = true
    } catch (err) {
        req.session.error = true
    }
    res.redirect("/dashboard");
});
router.post('/questions/update/:id', checkAuth, checkAdmin, async (req, res) => {
    const { state } = req.body;
    const id = req.params.id;
    try {
        const updatedQuestion = await Question.updateOne({ _id: id }, { state });
        req.session.success = true
        return res.json({ success: true, updatedQuestion });
    } catch (err) {
        req.session.error = true
        return res.json({ success: false });
    }
});
module.exports = router;
