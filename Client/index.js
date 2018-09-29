/*************************************************************
 * PROGRAM TO USE A WEBCAM TO CAPTURE FRAMES AND USE POSENET
 * TO DETERMINE IF A PERSON HAS COMPLETED A JUMPING JACK AND
 * OUTPUT THE NUMBER OF REPETITIONS COMPLETED
 * 
 * AUTHOR:      LAURENCE BURDEN
 * EMAIL:       LAURENCEBURDEN@GMAIL.COM
 * LICENSE:     MIT
 * CREATED:     08SEP18
 * MODIFIED:    26SEP18
 *************************************************************/


// Global variables for project
const   utils = new Utilities(1);       // utils holds camera functions
let     frameCanvas, startAndStop,      // Hold HTML elements for I/O
        scoreText, keyPointText,        // holds text output HTML objects
        videoInput, canvas, ctx,        // Will hold HTML elements of camera elements
        streaming, videoCap,            // Streaming flag and webcam stream
        score = 0, jackFlag = false,    // Flag to tell if a jumping jack was just counted    
        jackFlagText,                   // Will hold HTML element to display flag value  
        showKPFlag = false, KPButton;   // Flag to show keypoints on screen and button to toggle

// Constants that corrolate to body parts indexes in pose object
const   NOSE            =   0, 
        LEFTEYE         =   1,
        RIGHTEYE        =   2,
        LEFTSHOULDER    =   5,
        RIGHTSHOULDER   =   6,
        LEFTWRIST       =   9, 
        RIGHTWRIST      =   10, 
        LEFTANKLE       =   15, 
        RIGHTANKLE      =   16;

// Wait until the page is fully loaded
window.onload = () => init();

function init() {
    // Save HTML Elements and context for the overlay canvas
    startAndStop =  document.getElementById('startAndStop');
    KPButton     =  document.getElementById('toggleKPButton');
    keyPointText =  document.getElementById('keyPointText');
    videoInput   =  document.getElementById('videoInput');
    scoreText    =  document.getElementById('scoreText');
    jackFlagText =  document.getElementById('jackFlagText');
    canvas       =  document.getElementById('snapShotCanvas');
    ctx          =  canvas.getContext('2d');
    
    // Make the start/stop button toggle video
    startAndStop.addEventListener('click', toggleVideo);

    // Make keypoint button toggle keypoint display on screen
    KPButton.addEventListener('click', toggleKPDisplay);

    // Move the overlay canvas over the video output
    moveCanvas();

    //Enable start button
    startAndStop.disabled = false;
    startAndStop.innerText = 'Start';
}

// Starts and stops webcam
function toggleVideo() {
    if (!streaming) {
        videoCap = utils.startCamera('qvga', onVideoStarted, 'videoInput');
    } else {
        videoCap = null;
        utils.stopCamera();
        onVideoStopped();
    }
}

function toggleKPDisplay() {
    if (showKPFlag) {
        showKPFlag = false;
        clearCanvas();
        KPButton.innerText = "Display Keypoints"; 
    } else {
        showKPFlag = true;
        KPButton.innerText = "Hide Keypoints";
    }
}

// Moves overlay canvas over video output
function moveCanvas() {
    canvas.style.position   =   'absolute';
    canvas.style.left       =   videoInput.offsetLeft + 'px';
    canvas.style.top        =   videoInput.offsetTop + 'px';
}

// Setup video vars and start poseNet analysis
function onVideoStarted() {
    // Set vars for when video is on
    streaming               =   true;
    startAndStop.innerText  =   'Stop';
    videoInput.width        =   videoInput.videoWidth;
    videoInput.height       =   videoInput.videoHeight;

    // Start analyzing frames
    analyzeFrame();
}

// Set vars for when video is stopped
function onVideoStopped() {
    streaming               =   false;
    startAndStop.innerText  =   'Start';
}

// Main function for poseNet analysis
function analyzeFrame() {
    let frame;
    
    // Start collecting and analyzing video frames
    frame = snapshot();
    posenetCalc(frame);

}

// Takes a picture from video stream and returns a frame
function snapshot() {
    // Grab hidden canvas to change frame into an image
    frameCanvas =   document.getElementById('frameCanvas');
    frameCtx    =   frameCanvas.getContext('2d');
    let frame   =   new Image();

    // Draw the current frame on the canvas
    frameCtx.drawImage(videoInput, 0,0, frameCanvas.width, frameCanvas.height);

    // Change the canvas data to a png type image
    frame.src = frameCanvas.toDataURL('image/png');

    // Return the Image object
    return frame;
}

// Runs posenet
function posenetCalc(image) {
    var imageScaleFactor    =   0.8;    // Scale frame to 80%
    var outputStride        =   16;     // Scan the image with a 16X16 pixel square (options are 8, 16, and 32)
    var flipHorizontal      =   false;  // Don't flip (mirror effect)

    // Load the posenet object and run calculations on provided video frame
    posenet.load().then(function(net){
        var returnNet = net.estimateSinglePose(image, imageScaleFactor, flipHorizontal, outputStride);
        
        return returnNet;
    }).then(poseSuccessFunc, poseErrorFunc); // Pose object or error is automatically sent to either function
}

// Log error to web console
function poseErrorFunc(err) {
    console.log(`Error parsing pose: ${err}`);
}

// Success Function
function poseSuccessFunc(pose) {
    // console.log(JSON.stringify(pose));
    // Check confidence score of ankles and wrists
    let confidenceThresholdMet = checkConfidence(pose);
    
    if (showKPFlag) {
        // Draw circles on video overlay canvas
        drawKeypoints(pose);
    }

    if (confidenceThresholdMet){
        if (jackFlag) {
            // hands need to be lowered before
            // next jack is counted
            checkForNonJumpingJack(pose);
        } else {
            // Perform simple check
            // for wrists above shoulders
            checkForJumpingJack(pose);
        }
    }  

    sleep(1).then(
        analyzeFrame()
    );
}

function checkConfidence(pose) {
    let isHighEnough;
    // Need each item to have a higher than 20% confidence score
    (pose.keypoints[RIGHTWRIST].score > .2 && pose.keypoints[LEFTWRIST].score > .2) ? isHighEnough = true : isHighEnough = false;
    
    return isHighEnough
}

function checkForJumpingJack(pose) {
    // Grab positions we want to check (y is vertical position)
    let leftWristPos    = pose.keypoints[LEFTWRIST].position.y;
    let rightWristPos   = pose.keypoints[RIGHTWRIST].position.y;
    let headPosition    = pose.keypoints[NOSE].position.y;
    let eyePosition     = pose.keypoints[LEFTEYE].position.y;
    let leftShoulder    = pose.keypoints[LEFTSHOULDER].position.y;

    // Update position text on page
    updatePageText(leftWristPos, rightWristPos, headPosition, eyePosition);

    // Perform position check
    // Y value increases down the image
    // so check for less than values
    if (leftWristPos < leftShoulder && rightWristPos < leftShoulder) {
        jackFlag = true; // Mark that a jumping jack was scored
        updateCheckScore();
    }
}

function checkForNonJumpingJack(pose) {
    // Grab positions we want to check (y is vertical position)
    let leftWristPos    = pose.keypoints[LEFTWRIST].position.y;
    let rightWristPos   = pose.keypoints[RIGHTWRIST].position.y;
    let headPosition    = pose.keypoints[NOSE].position.y;
    let eyePosition     = pose.keypoints[LEFTEYE].position.y;

    // Update position text on page
    updatePageText(leftWristPos, rightWristPos, headPosition, eyePosition);

    // Perform position check
    if (leftWristPos > headPosition && rightWristPos > headPosition) {
        jackFlag = false; // Reset flag so next jack is counted
    }
}

function updatePageText(leftWristPos, rightWristPos, headPosition, eyePosition) {
    // Print keypoint vars to the page
    keyPointText.innerHTML =    `<ul>
                                    <li>Left Wrist Y:   ${leftWristPos}</li>
                                    <li>Right Wrist Y:  ${rightWristPos}</li>
                                    <li>Nose Pos Y:     ${headPosition}</li>
                                    <li>Eye Pos Y:      ${eyePosition}</li>
                                </ul>`;
    jackFlagText.innerHTML = jackFlag;
}


// Updates score on page
function updateCheckScore() {
    score++;
    scoreText.innerHTML = score;

    // Check if 15 jacks have been completed
    if (score >= 15) {
        console.log(`Opening box...`);
        openBox();
        resetSystem();

    }
}

// Resets system back to initial state
function resetSystem() {
    score = 0;
    toggleVideo();
}

// Send AJAX request to open the box
function openBox() {
    let xhttp = new XMLHttpRequest();
    const url = '/openBox';

    // Check if req was handled correctly
    xhttp.onreadystatechange = () => {
        if(this.readyState === 4 && this.status === 200) {
            console.log('Request for box open sent.');
        } else {
            console.log('Error with open box request.');
        }
    }

    xhttp.open('GET', url, true);
    xhttp.send();

}

// Cause program to 'sleep' for supplied milliseconds
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// A function to draw ellipses over the detected keypoints
function drawKeypoints(pose)  {
    let textPosLeft, textPosTop;    // Position for text overlay at each keypoint
    
    clearCanvas();
    
    // loop through all the keypoints
    for (let j = 0; j < pose.keypoints.length; j++) {
        
        // A keypoint is an object describing a body part (like rightArm or leftShoulder)
        let keypoint = pose.keypoints[j];
        
        // Only draw an ellipse is the pose probability is bigger than 0.3
        if (keypoint.score > 0.3) {
            
            // Move text of each point up and to the right
            textPosLeft = keypoint.position.x + 10;
            textPosTop  = keypoint.position.y + 10;
            
            // Start new path, draw circle for current point, and add text
            ctx.beginPath();
            ctx.arc(keypoint.position.x, keypoint.position.y, 5, 0, 2 * Math.PI, false);
            ctx.lineWidth = 3;
            ctx.strokeStyle = '#00ff00';
            ctx.fillText(keypoint.part, textPosLeft, textPosTop);
            ctx.stroke();
            
        }
    }
}

function clearCanvas() {
    //Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}


