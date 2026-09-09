/**
 * js/firebase-config.js
 * Clariora Firebase Web Configuration
 * Project: clariora (982161331628)
 */
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ClarioraFirebaseConfig = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  return {
    apiKey: 'AIzaSyAt5MnWAXJcL84vG6gxRoIksJL2bcfr4y8',
    authDomain: 'clariora.firebaseapp.com',
    projectId: 'clariora',
    storageBucket: 'clariora.firebasestorage.app',
    messagingSenderId: '982161331628',
    appId: '1:982161331628:web:0cfaed666267b7a3465609',
    measurementId: 'G-2W9WGX5F5X'
  };
});
