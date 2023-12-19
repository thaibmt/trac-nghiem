const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
    question: {
        type: String,
        required: true
    },
    answers: {
        type: Array,
        required: true,
    },
    correct_answers: {
        type: Array,
        required: true,
    },
    type: {
        type: String,
        enum: ['html', 'css', 'js'],
        default: 'html'
    },
    state: {
        type: String,
        enum: ['pending', 'approved', 'denied'],
        default: 'pending'
    },
    user_id: {
        type: String,
        required: true,
    }
});

const Question = mongoose.model('Question', questionSchema);

module.exports = Question;
