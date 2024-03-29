import delay from "./delay.js";
import WebSocket from "ws"
import ChromeIntercept from "./ChromeIntercept.js";

async function WebSocketManager(websocket, url, agent) {
  return new Promise((resolve, reject) => {
    try {
      const interceptor = new ChromeIntercept();
      let Targets = false, TargetAttempts = 0;
      websocket = new WebSocket(websocket);

      // Open WebSocket connection
      websocket.addEventListener('open', function open() {
        // Send request to get targets
        delay(1000).then(() => {
          TargetAttempts += 1

          if (Targets === true) {
            return
          };

          if (TargetAttempts >= 10) {
            resolve({
              success: false,
              code: 500,
              errormessage: "An error occurred on our side. Error getting Target infos."
            });
          };

          websocket.send(JSON.stringify({ id: 1, method: 'Target.getTargets', params: {} }));
          
          open()
        });
      });

      // Message event handler
      websocket.addEventListener('message', async function incoming(event) {
        try {
          const messageString = event.data.toString('utf8');
          const response = JSON.parse(messageString);

          if (response.id === 10 && response.result && response.result.result && response.result.result.value) {
            const data = JSON.parse(response.result.result.value)

            if (data.type === "Cookies") {
              websocket.send(JSON.stringify({ id: 9, method: 'Browser.close'}));

              await delay(500);

              if (websocket.readyState === 1) {
                websocket.close();
              }
              
              resolve(data)
            } else if (data.type === "Targets") {
              Targets = data.Targets
            } else if (data.type === "Error") {
              data.type = undefined
              resolve(data)
            }
          } else {
            interceptor.ChromeIntercept(response, websocket, url, agent)
          }
        } catch (error) {
          if (websocket.readyState === 1) {
            websocket.close();
          }
      
          resolve({
            success: false,
            code: 500,
            error,
            errormessage: "An error occurred on our side. Please check your request or try again later."
          });
        }
      });

      websocket.addEventListener('close', function close() {
        // Handle close event if needed
      });
    } catch (error) {
      if (websocket.readyState === 1) {
        websocket.close();
      }

      resolve({
        success: false,
        code: 500,
        error,
        errormessage: "An error occurred on our side. Please check your request or try again later."
      });
    }
  });
}

export default WebSocketManager;