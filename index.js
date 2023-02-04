/* Setup express server */
const express = require('express');
const app = express();
/* Setup Twilio */
const bodyParser = require('body-parser');
const { MessagingResponse } = require('twilio').twiml;
app.use(bodyParser.urlencoded({ extended: false }));

/* Dog Data */
const dog = {
  name: "",
}

/* Recieve Messages */
app.post('/sms', (req, res) => {
  const twiml = new MessagingResponse();
  console.log(req.body.Body);
  /* Functions */
  if (req.body.Body.toLowerCase().slice(0, 8) == 'name dog') {
    
    twiml.message('Hi!');
  } else if (req.body.Body == 'feed') {
    twiml.message('Goodbye');
  } else if (req.body.Body.toLowerCase() == 'walk'){

  } else if (req.body.Body.toLowerCase() == 'play fetch'){
    
  }else { /* OpenAI */
    twiml.message(
      'No Body param match, Twilio sends this in the request to your server.'
    );
  }

  res.type('text/xml').send(twiml.toString());
});

/* Start Server */
app.listen(8080, () => {
  console.log('Express server listening on port 8080');
});
