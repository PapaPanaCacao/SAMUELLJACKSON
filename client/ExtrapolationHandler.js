function TurningPoint(head, dir, seq)
{
	this.head = head;
	this.dir = dir;
	this.seq = seq;
};

function ExtrapolationHandler()
{
	//this.expectedSeq = 0;
	this.countTick = 0;//problem is tick may not get incremented if interval is cleared
	this.messages = [];//parsed messages
	//this.mapTurningPoints = [];
	this.tickPoints = [];
	this.extrapolate = genExtrapolate(this)
	this.checkRollback = genCheckRollback(this);
	this.inDeserialize = genInDesirialize(this);
	this.setTick = genSetTick(this);
	this.bufferMessage = (message) => {this.messages = this.messages.concat([message]);}
	this.timeOuts = [];
	
	this.set = ()=> {this.timeOuts = this.timeOuts.concat([window.setTimeout(this.extrapolate(this), 150)]);}
	this.clear = (x) => {clearTimeout(this.timeOuts[x]);}
	this.interval = window.setInterval(this.set,850);
};

function genSetTick(EH)
{
	function nest(seqNum)
	{
		EH.countTick = seqNum > EH.countTick ? seqNum : EH.countTick;
	}
	return nest;
}

function genExtrapolate(EH)
{
	function nest()
	{
		console.log(EH.mapTurningPoints)
		var sIndex2 = getModel().snakeIndex == 0 ? 1 : 0;
		//EH.mapTurningPoints = EH.mapTurningPoints.concat([new TurningPoint(head, getModel().getSnake(sIndex2).getDirection(), EH.countTick)]);
		EH.countTick = EH.countTick + 1;
		EH.tickPoints = [EH.countTick].concat(EH.tickPoints);
    console.log("growing snakes at Tick " + this.countTick);
		getModel().growSnake(0);
		getModel().growSnake(1);
		var sIndex = getModel().snakeIndex == 0 ? 1 : 0;
		var dir = getModel().getSnake(sIndex).getDirection();
		var head = getModel().getSnake(sIndex).getHead();
		//EH.mapTurningPoints = EH.mapTurningPoints.concat([new TurningPoint(head, dir, EH.countTick)]);//countTick maybe ahead 1
		
/*		
		if(snakeDead(0) && snakeDead(1))
		{
			ControllerTie();
			clearInterval(EH.interval);
		}
		else if(snakeDead(0))
		{
			ControllerWin(2);
			clearInterval(EH.interval);
		}
		else if(snakeDead(1))
		{
			ControllerWin(1);
			clearInterval(EH.interval);
		}
		else{;}
*/		
		ControllerTick();
		ViewRefresh();
	}
	return nest;
}

function genInDesirialize(EH)
{
	function nest(newDir, seq)
	{
		console.log("rollback? : "+this.timeOuts.length)
		if(seq >= EH.timeOuts.length)
		{
			//console.log("check roll: "+EH.timeOuts.length)
			getModel().growSnake(0);
			getModel().growSnake(1);
		}
		else
		{
			console.log("Timeouts seq : " + seq);
			EH.checkRollback(newDir);
		}
	}
	return nest;
}

function genCheckRollback(EH)
{
	function rollback(newDir, expectedSeq)
	{
		var snakeIndex = getModel().snakeIndex == 0 ? 1 : 0;
		var otherSnake = getModel().getSnake(snakeIndex);
		var count = 0;
		//if(!otherSnake.getDirection().equals(newDir))
		//{
			for(var i = 0; i < EH.tickPoints.length; ++i)
			{
				if(EH.tickPoints[i] == expectedSeq)
				{
					
					count = i +1;
					break;
				}
				console.log("tickpoints: "+EH.tickPoints[i])
				console.log("Expect:"+expectedSeq)
			}
			console.log("pointer head before: "+otherSnake.pointerHead + "count: "+count);
			otherSnake.pointerHead = otherSnake.pointerHead - count//(count-1);//if it goes one ahead this is the prob
			console.log("pointer head after: "+otherSnake.pointerHead);
			getModel().changeDirection(snakeIndex, newDir);
			//otherSnake.headPos = otherSnake.headPos;
			//console.log("hey: "+(EH.countTick - expectedSeq))
			for(var j = 0; j < count; ++j)
		{
				getModel().growSnake(snakeIndex);
		}
		//}
	}
	
	function nest(newDir)
	{
		EH.messages = EH.messages.sort((a,b)=>{return parseInt(a[5]) > parseInt(b[5]);});
		var messageSeq = parseInt(EH.messages[0][5]);
		console.log("messages: ")
		console.log(EH.messages)
		while(EH.messages.length > 0)
		{
			EH.messages = EH.messages.slice(1);
			//console.log("hey")
			rollback(newDir, messageSeq);
			if(EH.messages.length == 0 )
			{
				break;
			}
			messageSeq = parseInt(EH.messages[0][5]);
		}
	}
	return nest;
}