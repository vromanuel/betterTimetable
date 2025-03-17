import { validateSession } from "../../auth/sessionManager";

export default async function ServerComponent() {
  // The below checks if the user has logged in or not. 
  const { user } = await validateSession();

  return (
    <>
    <div className="bg-white text-black  min-h-screen">
      <p className="flex items-center justify-center text-3xl font-semibold pt-48">Hello! This is the study plan page</p>
    </div>    
    </>
  );
}
