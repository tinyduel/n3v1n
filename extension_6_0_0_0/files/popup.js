document.getElementById("1,1").checked = true
var score = 0
var direction = 0
var loc = [1,1];
document.onkeydown = checkKey;
function checkKey(e) {
    e = e || window.event;
    if (e.keyCode == '38') {
        console.log("up")
        //loc[0]--
	direction = 1
    }
    else if (e.keyCode == '40') {
        // down arrow
        //loc[0]++
	direction = 3
        console.log("down")
    }
    else if (e.keyCode == '37') {
       // left arrow
        console.log("left")
        //loc[1]--
	direction = 2
    }
    else if (e.keyCode == '39') {
       // right arrow
       console.log('right')
       //loc[1]++
       direction = 0
    }
}
var interval = window.setInterval(function(){
	if (direction == 0) { loc[1]++}
	else if (direction == 2) { loc[1]--}
	else if (direction == 3) { loc[0]++}
	else if (direction == 1) { loc[0]--}
	ploc=loc.join()
	console.log(ploc)
	console.log(loc)
	try {
		document.getElementById(ploc).checked
	}
	catch {
		document.getElementById("result").innerHTML = "GAME OVER - SCORE: " + score + " - Click to restart"
		clearInterval(interval)
	}
	if (document.getElementById(ploc).checked === false) {
		document.getElementById(ploc).checked = true
		console.log("YAY")
		score++
	} else if (document.getElementById(ploc).checked === true) {
		document.getElementById("result").innerHTML = "GAME OVER - SCORE: " + score + " - Click to restart"
		clearInterval(interval)
	}
	
	
}, 200);