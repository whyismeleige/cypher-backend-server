const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
    email:{
        type: String,
        required: [true,"Please Provide an Email!"],
        unique: [true,"Email already Exists"]
    },
    password:{
        type: String,
        required: [true,"Please provide a password!"],
        unique: false,
    },
    queries:[
        {
            prompt:{
                type: String,
            },
            answer:{
                type: String,
            }
        }
    ],
    ratings:[
        {
            rating: {
                type: Number
            },
            timestamp:{
                type: Date,
                default: Date.now
            }
        }
    ]
});

module.exports = mongoose.models.Users || mongoose.model("Users", UserSchema);