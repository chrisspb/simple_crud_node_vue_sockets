<template>
  <div>
    <h1>Messages</h1>
    <div>
      <form @submit.prevent="login">
        <label>
          Username:
          <input type="text" v-model="state.username" required />
        </label>
        <label>
          Password:
          <input type="password" v-model="state.password" required />
        </label>
        <button type="submit">Log In</button>
      </form>
      <div v-if="token">
        <h2>Logged in as {{ state.decodedToken.username }}</h2>
        <form @submit.prevent="addMessage">
          <label>
            New Message:
            <input type="text" v-model="state.newMessage" required />
          </label>
          <button type="submit">Add Message</button>
        </form>
        <ul>
          <li v-for="message in state.messages" :key="message.id">
            <div v-if="editingMessage !== message">
              <div>{{ message.text }}</div>
              <div>
                <button @click="editMessage(message)">Edit</button>
                <button @click="deleteMessage(message)">Delete</button>
              </div>
            </div>
            <div v-else>
              <form @submit.prevent="saveMessage">
                <label>
                  Edit Message:
                  <input type="text" v-model="state.editingMessage.text" required />
                </label>
                <button type="submit">Save</button>
                <button type="button" @click="cancelEdit">Cancel</button>
              </form>
            </div>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script>
import { reactive } from 'vue';
import axios from 'axios';
import jwt_decode from 'jwt-decode';
import io from 'socket.io-client';

const SOCKET_URL = 'http://localhost:4000';

export default {
  setup() {
    const state = reactive({
      username: '',
      password: '',
      token: '',
      decodedToken: {},
      messages: [],
      newMessage: '',
      editingMessage: null,
      socket: null,
    });

    const login = async () => {
      try {
        const response = await axios.post('http://localhost:4000/login', {
          username: state.username,
          password: state.password,
        });
        state.token = response.data.token;
        state.decodedToken = jwt_decode(state.token);
        state.username = '';
        state.password = '';
        connectToSocket();
        fetchMessages();
      } catch (err) {
        console.error(err)
      }
    };

    const fetchMessages = async () => {
      try {
        const response = await axios.get('http://localhost:4000/messages', {
          headers: {
            Authorization: 'Bearer ' + state.token,
          },
        });
        state.messages = response.data;
      } catch (err) {
        console.error(err);
      }
    };

    const addMessage = async () => {
      try {
        const response = await axios.post(
          'http://localhost:4000/messages',
          {
            text: state.newMessage,
          },
          {
            headers: {
              Authorization: 'Bearer ' + state.token,
            }
          }
        );
        state.messages.push(response.data);
        state.newMessage = '';
      } catch (err) {
        console.error(err);
      }
    };
 
    const editMessage = (message) => {
      state.editingMessage = message;
    };

    const saveMessage = async () => {
      try {
          const response = await axios.put(
          `http://localhost:4000/messages/${state.editingMessage.id}`,
          {
            text: state.editingMessage.text,
          },
          {
            headers: {
            Authorization: 'Bearer ' + state.token
          },
        }
    
      );
    
      const index = state.messages.findIndex(
        (message) => message.id === state.editingMessage.id
      );
      
      state.messages[index] = response.data;
      state.editingMessage = null;
    } catch (err) {
      console.error(err);
    }
    }; 

const cancelEdit = () => {
  state.editingMessage = null;
};

const deleteMessage = async (message) => {
  try {
    await axios.delete(`http://localhost:4000/messages/${message.id}`, {
      headers: {
        Authorization: `Bearer ${state.token}`,
      },
    });
    const index = state.messages.indexOf(message);
    state.messages.splice(index, 1);
  } catch (err) {
    console.error(err);
  }
};

const connectToSocket = () => {
  console.log(state.token)
  state.socket = io(SOCKET_URL, {
    auth: {
      token: state.token,
    },
  });
  state.socket.on('newMessage', (message) => {
    state.messages.push(message);
  });
  state.socket.on('messageUpdated', (message) => {
    const index = state.messages.findIndex(
      (m) => m.id === message.id
    );
    if (index !== -1) {
      state.messages[index] = message;
    }
  });
  state.socket.on('messageDeleted', (message) => {
    const index = state.messages.findIndex(
      (m) => m.id === message.id
    );
    if (index !== -1) {
      state.messages.splice(index, 1);
    }
  });
};

return {
  state,
  login,
  fetchMessages,
  addMessage,
  editMessage,
  saveMessage,
  cancelEdit,
  deleteMessage,
};

},
};
</script>


<style>
/* Add your own styles here */
</style>
