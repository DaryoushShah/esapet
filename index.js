/* Allow require() */
import { createRequire } from "module";
const require = createRequire(import.meta.url);

/* dot env */
require('dotenv').config({path:'./.env'})
/* Setup express server */
const express = require('express');
const app = express();
7
/* Setup node fetch */
import fetch from 'node-fetch';
const MODERATION_API_URL = 'https://api.openai.com/v1/moderations';
const MODERATION_API_HEADERS = {
  "Content-Type": "application/json",
  "Authorization": `Bearer ${process.env.OPENAI_SECRET_KEY}`,
}

/* Setup Twilio */
const bodyParser = require('body-parser');
const { MessagingResponse } = require('twilio').twiml;
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = require('twilio')(accountSid, authToken);
app.use(bodyParser.urlencoded({ extended: false }));

/* OPEN AI*/
const { Configuration, OpenAIApi } = require('openai');
const configuration = new Configuration({
  apiKey: process.env.OPENAI_SECRET_KEY
});
const openai = new OpenAIApi(configuration);

/* JSON */
const fs = require('fs');

/* User info */
const userInfo = {
  name: '',
  phoneNumber: '',
  emergencyContact: '',
  emergencyContactPhoneNumber: '',
}

/* Dog Data */
const dog = {
  name: '',
  happiness: 0,
}

/* Methods */
const _loadJSON = (filepath) => {
  /* Check to ensure file is of type .json */
  if(filepath.slice(filepath.length - 5) !== '.json'){
    console.log('ERROR: Attempting to load JSON object from file not ending in \'.json\'');
    return null;
  }
  /* Return object for opened JSON file */
  return JSON.parse(fs.readFileSync(filepath));
}

const _getImageURL = (category) => {
  let maxIndex = 0;
  if(media[category].length < dog['happiness']){
    maxIndex = media[category].length;
  }else{
    maxIndex = dog['happiness'];
  }
  return media[category][Math.floor(Math.random()*maxIndex)];
}

const _getResponse = (category) => {
  return responses[category][Math.floor(Math.random()*responses[category].length)];
}

/* Media */
const media = _loadJSON('./json/media.json');
const responses = _loadJSON('./json/responses.json');

/* Recieve Messages */
app.post('/sms', async (req, res) => {
  const twiml = new MessagingResponse();
  console.log(req.body.Body);
  /* Functions */
  /* Setup user info */
  if(req.body.Body.toLowerCase().slice(0, 'my name is'.length) == 'my name is'){
    const message = twiml.message();
    userInfo['name'] = req.body.Body.slice('my name is'.length + 1, req.body.Body.length);
    message.body(`Hi, its nice to meet you ${userInfo['name']}!`);
  }else if(req.body.Body.toLowerCase().slice(0, 'my emergency contact is'.length) == 'my emergency contact is'){
    const message = twiml.message();
    userInfo['emergencyContact'] = req.body.Body.slice('my emergency contact is'.length + 1, req.body.Body.length);
    message.body(`Thanks for letting us know about ${userInfo['emergencyContact']}! Please give us their number so we can message them if times get rough.`);
  }else if(req.body.Body.toLowerCase().slice(0, 'my emergency contacts number is'.length) == 'my emergency contacts number is'){
    const message = twiml.message();
    userInfo['emergencyContactPhoneNumber'] = req.body.Body.slice('my emergency contacts number is'.length + 1, req.body.Body.length);
    message.body(`We will reach out to ${userInfo['emergencyContact']} @ ${userInfo['emergencyContactPhoneNumber']} if we determine you are in a crisis mode`);
  } else if (req.body.Body.toLowerCase().slice(0, 8) == 'name dog') {
    /* Check if there is a name */
    if(req.body.Body.length < 10){
      twiml.message = 'Please add a name longer than 1 character'
    }else{
      const message = twiml.message();
      dog["name"] = req.body.Body.slice(9, req.body.Body.length);
      message.body(`Hi, i'm called ${dog["name"]}`);
      const imageURL = _getImageURL('dogs');
      message.media(imageURL);
      /* Increase happiness */
      dog['happiness'] += 1;
    }
  /* Feed Functionality */
  } else if (req.body.Body.toLowerCase() == 'feed') {
    /* Generate response */
    const response = _getResponse('feed');
    /* Generate image */
    const imageURL = _getImageURL('feed');
    /* Set message parameters */
    const message = twiml.message();
    message.body(`${dog['name']} ${response}`);
    message.media(imageURL);
    /* Increase happiness of dog */
    dog['happiness'] += 1;
  /* Walk */
  } else if (req.body.Body.toLowerCase() == 'walk'){
    /* Generate Response */
    const response = _getResponse('walk');
    /* Generate Image */
    const imageURL = _getImageURL('walk');
    /* Set message parameters */
    const message = twiml.message();
    message.body(`${dog['name']} ${response}`);
    message.media(imageURL);
    /* Increase happiness of dog */
    dog['happiness'] += 1;
  /* Fetch Functionality */
  } else if (req.body.Body.toLowerCase() == 'play fetch'){
    /* Generate responses */
    const response = _getResponse('play fetch');
    /* Generate Image */
    const imageURL = _getImageURL('fetch');
    /* Set message parameters */
    const message = twiml.message();
    message.body(`${dog['name']} ${response}`);
    message.media(imageURL);
    /* Increase happiness of dog */
    dog['happiness'] += 1;
  }else { /* OpenAI */
    // asyncOpenAI(req.body.Body).then(data => {xs
    // });
    /* Check for harmful content */
    let self_harm_detection = false;
    const moderator = await fetch(MODERATION_API_URL, {
      method: 'POST',
      headers: MODERATION_API_HEADERS,
      body: JSON.stringify({
      input: req.body.Body,
      }),
    });

    const data = await moderator.json();

    if(data['results'][0]['categories']['self-harm'] == true){
      self_harm_detection = true;
      console.log('self harm detected');
    }

    const response = await openai.createCompletion({
      model: "text-davinci-003",
      prompt: req.body.Body,
      temperature: 0.7,
      max_tokens: 2000,
      frequency_penalty: 0.7
    });
    const message = twiml.message();
    if(self_harm_detection == true){
      message.body(response.data.choices[0].text.trim()
       + `We are going to reach out to ${userInfo['emergencyContact']} to check in on you. In the mean time watch this funny video. Or if you aren't interested in watching a video feel free to just talk to me. Please don't do anything rash in the moment. Take a deep breath. It'll be ok.`
      );
      message.media('https://www.youtube.com/watch?v=5gPNRYZM7c4');
      /* Message Emergency contact */
      client.messages
        .create({
          body: `Please check in on ${userInfo['name']}. They are not in a good headspace mentally right now and there is risk of self-harm.`,
          from: process.env.TWILIO_NUMBER,
          to: userInfo['emergencyContactPhoneNumber']
          }).then(console.log(`Messaged ${userInfo['emergencyContact']} due to potential self harm`));
    }else{
      message.body(response.data.choices[0].text.trim());
      const imageURL = _getImageURL('dogs');
      message.media(imageURL);
    }
  }

  res.type('text/xml').send(twiml.toString());
});

/* Start Server */
app.listen(8080, () => {
  console.log('Express server listening on port 8080');
});
