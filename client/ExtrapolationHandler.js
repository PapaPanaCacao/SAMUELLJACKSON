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
	this.mapTurningPoints = [];
	this.extrapolate = genExtrapolate(this)
	this.checkRollback = genCheckRollback(this);
	this.inDeserialize = genInDesirialize(this);
	this.bufferMessage = (message) => {this.messages = this.messages.concat([message]);}
	this.timeOuts = [];
	
	this.set = ()=> {this.timeOuts = this.timeOuts.concat([window.setTimeout(this.extrapolate(this), 150)]);}
	this.clear = (x) => {clearTimeout(this.timeOuts[x]);}
	this.interval = window.setInterval(this.set,850);
};

function genExtrapolate(EH)
{
	function nest()
	{
		console.log(EH.mapTurningPoints)
		var sIndex2 = getModel().snakeIndex == 0 ? 1 : 0;
		EH.mapTurningPoints = EH.mapTurningPoints.concat([new TurningPoint(head, getModel().getSnake(sIndex2).getDirection(), EH.countTick)]);
		EH.countTick = EH.countTick + 1;
		getModel().growSnake(0);
		getModel().growSnake(1);
		var sIndex = getModel().snakeIndex == 0 ? 1 : 0;
		var dir = getModel().getSnake(sIndex).getDirection();
		var head = getModel().getSnake(sIndex).getHead();
		//EH.mapTurningPoints = EH.mapTurningPoints.concat([new TurningPoint(head, dir, EH.countTick)]);//countTick maybe ahead 1
		
		
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
		
		ControllerTick();
		ViewRefresh();
	}
	return nest;
}

function genInDesirialize(EH)
{
	function nest(newDir, seq)
	{
		//console.log("rollback? : "+this.timeOuts.length)
		if(seq >= EH.timeOuts.length)
		{
			//console.log("check roll: "+EH.timeOuts.length)
			getModel().growSnake(0);
			getModel().growSnake(1);
		}
		else
		{
			console.log(9)
			EH.checkRollback(newDir);
		}
	}
	return nest;
}

/*function genCheckRollback(EH) //method test this baby
{
	function handleRollback(newDir, expectedSeq)
	{
		var snakeIndex = getModel().snakeIndex == 0 ? 1 : 0;
		var otherSnake = getModel().getSnake(snakeIndex);
		
		if(!otherSnake.getDirection().equals(newDir))
		{
			
			otherSnake.headPos = otherSnake.headPos - (EH.countTick - expectedSeq);
			console.log("hey: "+(EH.countTick - expectedSeq))
			//change direction
			getModel().changeDirection(snakeIndex, newDir);
			for(var i = 0; i < (EH.countTick - expectedSeq); ++i)
			{
				getModel().growSnake(snakeIndex);
				//otherSnake.growSnake();
			}
		}
	}
	
	
	function nest(newDir)
	{
		var expectedSeq = EH.countTick
		
		//console.log(EH.messages[0][4])
		
		EH.messages = EH.messages.sort((a,b)=>{return parseInt(a[4]) < parseInt(b[4]);});
		var p = parseInt(EH.messages[0][4]);
		//EH.messages = EH.messages.sort((a,b)=>{return parseInt(a[4]) < parseInt(b[4]);});
		//console.log("length "+ EH.messages.length, "p = "+p, "EH.expectedSeq " + expectedSeq)
		while(EH.messages.length > 0 && p <= expectedSeq)//EH.expectedSeq)
		{
			//console.log("in while")
			EH.messages = EH.messages.slice(1);
			expectedSeq = expectedSeq + 1;
			//console.log("hey")
			handleRollback(newDir, p);
			if(EH.messages.length == 0 )
			{
				break;
			}
			p = parseInt(EH.messages[0][4]);
			
			//console.log("in while iiii"+p)
		}
		//console.log("rollBAKC II")
	}
	
	return nest;
}*/

function genCheckRollback(EH)
{
	function rollBack(messageSeq, newDir)
	{
		console.log("hi")
		//get snake head - (tick - messageSeq)
		var sIndex = getModel().snakeIndex == 0 ? 1 : 0;
		var delta = EH.countTick - messageSeq;
		getModel().getSnake(sIndex).headPointer = getModel().getSnake(sIndex).headPointer - delta;
		getModel().changeDirection(sIndex, newDir);
		while(delta != 0)
		{
			getModel().growSnake(sIndex);
			delta = delta -1
		}
	}
	
	function handleRollback(newDir, messageSeq)
	{
		var newArray = [];
		for(var i = 0; i < EH.mapTurningPoints.length; ++i)
		{
			if(EH.mapTurningPoints[i].seq == messageSeq)
			{
				if(!newDir.equals(EH.mapTurningPoints[i].dir))
				{
					rollBack(messageSeq, newDir);
				}
			}
			else
			{
				newArray.concat([EH.mapTurningPoints[i]]);
			}
		}
		EH.mapTurningPoints = newArray;
	}
	
	function nest(newDir)
	{
		var expectedSeq = EH.countTick;
		EH.messages = EH.messages.sort((a,b)=>{return parseInt(a[4]) < parseInt(b[4]);});
		var messageSeq = parseInt(EH.messages[0][4]);
		while(EH.messages.length > 0 && messageSeq <= expectedSeq)
		{
			EH.messages = EH.messages.slice(1);
			expectedSeq = expectedSeq + 1;
			//console.log("hey")
			handleRollback(newDir, messageSeq);
			if(EH.messages.length == 0 )
			{
				break;
			}
			messageSeq = parseInt(EH.messages[0][4]);
		}
	}
	return nest;
}