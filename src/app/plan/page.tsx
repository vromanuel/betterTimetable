import React from 'react';
import Details from './sidebarView'; // Adjust import path accordingly
import { validateSession } from "../../auth/sessionManager";

export default async function ServerComponent() {
  
  const { user } = await validateSession();

  return (
    <>
      <Details userId={user.id} />
    </>
  );
}
