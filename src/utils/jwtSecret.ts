const envSecret = process.env.JWT_SECRET;

if (!envSecret) {
  throw new Error(
    'JWT_SECRET environment variable must be set — refusing to start with a guessable default.'
  );
}

const JWT_SECRET: string = envSecret;

export default JWT_SECRET;
