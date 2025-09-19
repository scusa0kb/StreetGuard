const mongoose = require('mongoose');

const ReportSchema = new mongoose.Schema({
  description: { type: String, required: true },
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  faction: { type: String, default: "" },
  date: { type: Date, default: Date.now },
  comments: [{
    text: String,
    date: { type: Date, default: Date.now }
  }]
});

module.exports = mongoose.model('Report', ReportSchema);