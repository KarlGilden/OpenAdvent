The goal is to create a harness for advent calendars, where there is a standard frontend advent calendar, with a a swappable backend service that calculates what is inside the advent for that day.

## Frontend

A cozy styled web view for an advent calendar. The advent calendar should run from 1 - 25 and have a door like animation when an advent is opened. Use christmas colours.

## Architecture

Have a standard interface that the frontend components calls e.g openAdvent(advent: number).

The way an advent result is calculated is determined by a service. For v1, lets make a compliment advent calendar. The adventService should read from a JSON file which is structured like this for example: { 1: "You are cute!", 2: "You're brilliant", ...}.

For user persistence, just store what advents have been opened for your current browser using localstorage, but hide it behind a standard interface so that it can be swapped for a db connection later.

The result should just be a string that displays inside the advent door.
All the services live in a folder /services in the react frontend and simply imported where needed.

## Tech

Vite React with Typescript, standard CSS with a standard colour design system. Keep CSS very simple.
