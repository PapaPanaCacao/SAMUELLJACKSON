#include <stdlib.h>
#include <iostream>
#include <string>
#include <queue>
#include <sstream>
#include <cstring>
#include <time.h>
#include "manageconnection.h"
#include "websocket.h"

using namespace std;

struct QueueQuintuple
{
	string message;
	int delay;
	int clientID;
	int timestamp;
	int seqNum;
	bool operator() (QueueQuintuple& qp1,QueueQuintuple& qp2)
    {
        //return qp1.delay > qp2.delay;
		return qp1.seqNum > qp2.seqNum;
    }
};

//struct for serialization
map<int,int> timeStampMap = map<int,int>();
webSocket server;
ConnectionManager cm = ConnectionManager(&server, 12, 9);//server is not initialized..well see.
//ConnectionManager cm = ConnectionManager(&server, 9, 12);
priority_queue <QueueQuintuple, vector<QueueQuintuple>, QueueQuintuple> messageQueue;
//maps clientID with sequence count;
map<int,int> clientIDSequenceCount = map<int,int>();

int gcount = 0;  // connexion number count and ID
time_t  timev;
int seq = 0;
//time(&timev);

/* called when a client connects */
void openHandler(int clientID)
{
	time(&timev);
	time_t temp = timev;
	ostringstream os;
	//bool isZero = gcount == 0;
	//os << "init"<<":"<<isZero?"2:2":"4:4";
	
	cm.connNumWithClientID(clientID, gcount);
	clientIDSequenceCount[clientID] = 0;
	time(&timev);
	os << "init:" << gcount << ":" <<(timev-temp);
  cout << __FUNCTION__ << ": " << "init sends [" << os.str() <<"]" << endl;
	cm.send(clientID, os.str());
	/*int x,y = 4;
	if(isZero)
	{
		x = 2;
		y = 2;
	}

	cm.addSnake(clientID, x, y, Tuple(0,1));*/
	gcount = gcount == 0 ? 1 : 0;
}

/* called when a client disconnects */
void closeHandler(int clientID)
{   
  cout << __FUNCTION__ << ": " <<"end"<<":"<< endl;
	cm.removeConn(clientID);
	cm.removeSnake(clientID);
  gcount = cm.getConnNum(clientID) == 1 ? 1 : 0;
}

vector<string> parseMessage(string message)
{
	vector<string> mVect = vector<string>();
	ostringstream in;
	string::iterator it;
	for(it = message.begin(); it != message.end(); ++it)
	{
		if((*it) != ':')
		{
			in << (*it);
		}
		else
		{
			mVect.push_back(in.str());
			in.str("");
		}
	}
	mVect.push_back(in.str());
  cout << __FUNCTION__ <<  " to " <<  mVect.size() <<  " pieces" << endl;
	return mVect;
}

bool isInitMessage(string str)
{
	return strcmp(str.c_str(), "init") == 0;
}

void initializeConnection(int clientID, vector<string> mVect)
{
	cout << __FUNCTION__ <<  " : registering in IDs index " << clientID << " named " << atoi(mVect.at(1).c_str()) << endl;
	cm.addConn(clientID, atoi(mVect.at(1).c_str()));
	if(cm.connReady())
	{
    cout << __FUNCTION__ << " : 2 client IDs are registrated, so state is connReady we can start a new game" << endl;
		cm.newGame();
		cm.sendIDs();//on client side, wait until "start"
	}
}

void decrementDelays()
{
	vector<QueueQuintuple> temp = vector<QueueQuintuple>();
	while(messageQueue.size() != 0)
	{
		QueueQuintuple qp = messageQueue.top();
		qp.delay--;
		temp.push_back(qp);
		messageQueue.pop();
	}
	for(vector<QueueQuintuple>::iterator it = temp.begin(); it!= temp.end(); ++it)
	{
		messageQueue.push(*it);
	}
}

/* called when a client sends a message to the server */
void messageHandler(int clientID, string message)
{
	//puts message in buffer
	if(cm.isGameOn())
	{
		time(&timev);
		time_t tempTime = timev;
		vector<string> mVect = parseMessage(message);
		if(isInitMessage(mVect.at(0)))
		{
			//parse message and get id
      cout << __FUNCTION__ << ": is an Init message from client ID : " << clientID << " with named other ID : " << mVect.at(1) << endl;
			initializeConnection(clientID, mVect);
			return;
		}

    //cm.updateModel(clientID, cm.deserialize((unsigned char*)message.c_str()));
		QueueQuintuple qp = QueueQuintuple();
		qp.message = message;		
		qp.clientID = clientID;
		qp.timestamp = tempTime;
		qp.delay = (static_cast<int>(floor(rand() *  3))+1) % 3;
		qp.seqNum = seq;
		//cout << __FUNCTION__ << " delay: " << qp.delay << endl;
		if(qp.delay < 0)
		{
			qp.delay*=-1;
		}
		messageQueue.push(qp);
		clientIDSequenceCount[clientID] = clientIDSequenceCount[clientID]+1;
    cout << __FUNCTION__ << ": Recieved message is added in messageQueue" << endl;
    cout << "---------------message : [" << message << "]" << " clientID : [" << qp.clientID << "]" \
         << " timestamp : [" << qp.timestamp << "]" << " delay : [" << qp.delay << "]" \
         << " clientIDSequenceCount " << clientIDSequenceCount[clientID] << endl;
	}
}

void inPeriodic()
{
		//serializing new state
	ostringstream os;		
	QueueQuintuple qp;
	vector<QueueQuintuple> rejectList = vector<QueueQuintuple>();

	if(cm.isGameOn())
	{
	decrementDelays();
  if (messageQueue.size() > 0)
   	cout << __FUNCTION__ <<  " messageQueue last's message delay [" << messageQueue.top().delay <<  "]" << endl;
  else
   	cout << __FUNCTION__ <<  " messageQueue is empty" << endl;
	++seq;
	while(messageQueue.size()!=0 && (qp = messageQueue.top()).delay <= 0)
	{
    cout << __FUNCTION__ << ": Treatement of message on the top of messageQueue" << endl;
    cout << "<<<<<<<<<<<<<<<message : [" << qp.message << "] client.js:233:3" << endl;
    cout << " clientID : [" << qp.clientID << "]" \
         << " timestamp : [" << qp.timestamp << "]" << " delay : [" << qp.delay << "]" << endl;

		messageQueue.pop();
		
    cm.updateModel(qp.clientID, cm.deserialize((unsigned char*)qp.message.c_str()));
		//cout << qp.seqNum << endl << " tstamp: "<<qp.timestamp << " SIZE: "<<messageQueue.size()<<endl;
		map<int,int>::iterator it = timeStampMap.find(qp.timestamp);
		if(cm.stateReady(qp.clientID, qp.seqNum) && it == timeStampMap.end())//THIS IS MAKES IT SO ONLY ONE OF PAIRED SEQ NUM MESSAGES WILL GET SENT
		{
			timeStampMap[qp.timestamp] = 1;
			//cout << __FUNCTION__ << endl;
			Compressed* c = static_cast<Compressed*>(malloc(sizeof(struct Compressed)));
			cm.moveModel(c);
			time(&timev);
			os << cm.serialize(c) << ":" << (timev-qp.timestamp) << ":" << qp.seqNum ;
			//cout << " time stamp: " << timev-qp.timestamp << endl;
      cout << __FUNCTION__ << ": " << "Server sends game evolution to clients [" << os.str() << "]" << endl;

			cm.sendAll(os.str().c_str());

			os.str("");
			free(c);
		}
		else
		{
			rejectList.push_back(qp);
		}
	}

	for(vector<QueueQuintuple>::iterator it = rejectList.begin(); it != rejectList.end(); ++it)
	{
		messageQueue.push(*it);
	}
			
  }//cm.isGameOn()
  else
  {
    Sleep(1000);
  }
		
}

/* called once per select() loop */
void periodicHandler()
{
	if(cm.connReady())
	{
		static time_t next = time(NULL) + 2;
		time_t current = time(NULL);
		if (current >= next)
		{
			inPeriodic();
			next = time(NULL) + 2;
		}
	}
}

int main(int argc, char *argv[])
{
    int port  = 21234;

    //cout << "Please set server port: ";
    //cin >> port;

    /* set event handler */
    server.setOpenHandler(openHandler);
    server.setCloseHandler(closeHandler);
    server.setMessageHandler(messageHandler);
    server.setPeriodicHandler(periodicHandler);

    /* start the chatroom server, listen to ip '127.0.0.1' and port '8000' */
    server.startServer(port);

	cout << __FUNCTION__ <<  "-EXIT" << endl;
    return 1;
}
