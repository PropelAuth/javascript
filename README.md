<p align="center">
  <a href="https://www.propelauth.com?ref=github" target="_blank" align="center">
    <img src="https://www.propelauth.com/imgs/lockup.svg" width="200">
  </a>
</p>

# PropelAuth Javascript Library

A library for managing authentication in the browser, backed by [PropelAuth](https://www.propelauth.com). 

[PropelAuth](https://www.propelauth.com?ref=github) makes it easy to add authentication and authorization to your B2B/multi-tenant application.

Your frontend gets a beautiful, safe, and customizable login screen. Your backend gets easy authorization with just a few lines of code. You get an easy-to-use dashboard to config and manage everything.

## Documentation

- Full reference this library is [here](https://docs.propelauth.com/reference/frontend-apis/js)
- Getting started guides for PropelAuth are [here](https://docs.propelauth.com/)

## Installation and Usage

```bash
npm install @propelauth/javascript
```

and then you can import it:

```js
import { createClient } from "@propelauth/javascript";
```

Alternatively, you can use a CDN:

```html
<script 
    src="https://www.unpkg.com/@propelauth/javascript@2.0.11/dist/javascript.min.js" 
    integrity="sha384-FENNH2f7QuQvkZJBL7jebLr0OtYKgTA2iq+C5g3VXXX7SBwWmeMMoc+pBBtcn76G" 
    crossorigin="anonymous"></script>
```

then a global PropelAuth object will be created, and you can call createClient from it:

```html
<script>
  PropelAuth.createClient({...});
</script>
```

## Using the Javascript library

You'll create a client using the [createClient](#create-client) function, and then you can use the client to get information about the current user.

You can also enabled background token refresh, which will automatically refresh the user's information periodically and on key events (e.g. user switches tabs, reconnects to the internet, etc).


### createClient

Creates an authentication client which manages your user's [access token](https://docs.propelauth.com/guides-and-examples/guides/access-tokens), fetches user information, and provides other useful authentication functions.

The client also refreshes auth information when a user switches focus to your tab or reconnects (if they were offline).

```js
const authClient = createClient({
  // The base URL where your authentication pages are hosted.
  // You can find this under the Frontend Integration section for your project.
  authUrl: "https://auth.yourdomain.com",

  // If true, periodically refresh the access token in the background.
  // This helps ensure you always have a valid token ready to go. Default true.
  enableBackgroundTokenRefresh: true,
});
```

## Questions?

Feel free to reach out at support@propelauth.com
