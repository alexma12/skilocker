var mongoose = require("mongoose");

var itemSchema = new mongoose.Schema({
	name: {type: String, required: true},
	image: String,
	imageId: String,
	description: {type: String, required: true},
	price: {type: Number, required: true},
	location: {type: String, required: true},
	lat: Number,
	lng: Number,
	contactName: {type: String, required: true},
	phone: {type: String, required: true},
	condition: {type: String, required: true},
	isPending: {
		type: Boolean,
		default: false
	},
	isSold: {
		type: Boolean,
		default: false
	},
	createdAt: {
		type: Date,
		default: Date.now
	},
	author:{
	id:{
	type: mongoose.Schema.Types.ObjectId,
	ref: "User"
},

username: String
},
comments: [
{
	type: mongoose.Schema.Types.ObjectId,
	ref: "Comment"
}
],
likes: [
		{
				type: mongoose.Schema.Types.ObjectId,
				ref: "User"
		}
]
});

module.exports = mongoose.model("Item", itemSchema);
