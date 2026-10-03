[Canvas.pdf](https://github.com/user-attachments/files/31625702/Canvas.pdf)

## GitHub Pages deployment

The Pages workflow builds the public portfolio, website-template, contact, login, and registration pages as static files and deploys them when changes are pushed to `main`. In the repository settings, set **Pages → Build and deployment → Source** to **GitHub Actions**.

GitHub Pages cannot run the Express server. The static contact/login/register forms demonstrate browser-side validation only; form values are not submitted or stored. The Google OAuth buttons are demo-only because OAuth requires a server-side callback. The Express app remains available for local development. To load the Google Map, add a `GOOGLE_MAPS_API_KEY` repository Actions secret and restrict that browser key to the Pages domain.


<img width="1402" height="1122" alt="Summarize" src="https://github.com/user-attachments/assets/ca8be10c-4a71-4204-82cd-dff3cdf2de19" />
<img width="1536" height="1024" alt="Summarize1" src="https://github.com/user-attachments/assets/0eca9950-ba2c-4a8a-8205-d85ed2595d58" />
<img width="1010" height="761" alt="Storing User Generated Data" src="https://github.com/user-attachments/assets/5cf49a1e-d488-4efe-b388-e91352054f1e" />
<img width="347" height="689" alt="Project Structure" src="https://github.com/user-attachments/assets/ed6607f7-e380-4f9d-a625-12dee74af78c" />
<img width="1194" height="552" alt="Managing User Generated Data" src="https://github.com/user-attachments/assets/ff5f60f2-d88c-4e2e-a99f-c35ebc54a546" />
<img width="1004" height="512" alt="Google Oauth API" src="https://github.com/user-attachments/assets/3fdbe490-e20e-42ae-b89d-b379d26d6707" />
<img width="964" height="533" alt="Google Maps API" src="https://github.com/user-attachments/assets/9448249f-c69d-4fe5-ae5b-9c816440c89f" />
