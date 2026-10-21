/* FORGE — Firebase public web configuration.
 * Firebase Web API keys are identifiers, not service-account secrets.
 * Never place a Firebase service-account/private key in this file.
 */
export const firebaseConfig = Object.freeze({
  apiKey: 'AIzaSyDIc10JLcbiDmnTWu9ieRPNetiBSJg7c3E',
  authDomain: 'forge-video-editor.firebaseapp.com',
  projectId: 'forge-video-editor',
  storageBucket: 'forge-video-editor.firebasestorage.app',
  messagingSenderId: '12467445573',
  appId: '1:12467445573:web:fb95b779485b74a602a82c',
  measurementId: 'G-0L7QESQ9M7'
});

export const FIREBASE_ENABLED = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);
export const FIREBASE_AUTH_URL = `https://identitytoolkit.googleapis.com/v1`;
export const FIREBASE_SECURE_TOKEN_URL = 'https://securetoken.googleapis.com/v1/token';
export const FIRESTORE_URL = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents`;
