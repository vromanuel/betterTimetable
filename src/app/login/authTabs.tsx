"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import "../../../styling/globals.css";
import login from "./loginProcess";
import signup from "./signupProcess";

// --------------------------------------------------------------------
//                  HERE IS WHERE THE TABS ARE DEFINED
// --------------------------------------------------------------------

export default function AuthTabs() {
  const [activeTab, setActiveTab] = useState("login");
  const [errorMessage, setErrorMessage] = useState("");
  const router = useRouter();

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setErrorMessage(""); // Clear the error message when switching tabs
  };

  const handleLogin = async (username: string, password: string) => {
    const response = await login(username, password);
    if (response.success) {
      localStorage.setItem("sessionToken", response.sessionToken); // Store session token
      router.push("/");
    } else {
      setErrorMessage(response.message);
    }
  };

  const handleSignup = async (
    username: string,
    password: string,
    email: string,
    title: string,
    firstName: string,
    lastName: string
  ) => {
    const response = await signup(
      username,
      password,
      email,
      title,
      firstName,
      lastName
    );
    if (response.success) {
      router.push("/");
    } else {
      setErrorMessage(response.message);
    }
  };

  return (
    <div className="min-h-screen flex loginBackground justify-center items-center">
      <div className="my-16 px-20 pt-8 pb-12 w-2/5 bg-gray-1000 rounded-xl relative z-10">
        <div className="flex justify-center mb-10 border-b border-gray-300">
          <button
            className={`py-2 px-6 ${
              activeTab === "login"
                ? "border-b-2 border-blue-1000 text-blue-1000"
                : "text-gray-300"
            }`}
            onClick={() => handleTabChange("login")}
          >
            Login
          </button>
          <button
            className={`py-2 px-6 ${
              activeTab === "signup"
                ? "border-b-2 border-blue-1000 text-blue-1000"
                : "text-gray-300"
            }`}
            onClick={() => handleTabChange("signup")}
          >
            Signup
          </button>
        </div>

        {activeTab === "login" ? (
          <LoginForm onSubmit={handleLogin} errorMessage={errorMessage} />
        ) : (
          <SignupForm onSubmit={handleSignup} errorMessage={errorMessage} />
        )}
      </div>
    </div>
  );
}

// --------------------------------------------------------------------
//             HERE IS WHERE WE KEEP THE FORM TO LOGIN
// --------------------------------------------------------------------

function LoginForm({ onSubmit, errorMessage }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(username, password);
  };

  return (
    <div>
      <div className="flex flex-col items-center mb-5">
        <p className="text-2xl font-bold mb-2">Login</p>
        <p className="text-m">
          Hi! Please enter your details to sign into your account
        </p>
      </div>
      {errorMessage && <p className="text-red-500">{errorMessage}</p>}
      <form onSubmit={handleSubmit}>
        <AuthFields
          isSignup={false}
          username={username}
          setUsername={setUsername}
          password={password}
          setPassword={setPassword}
        />
        <div className="flex justify-center">
          <button
            type="submit"
            className="mt-5 bg-blue-1000 text-white py-2 px-8 rounded-full transition duration-300 ease-in-out hover:bg-blue-800"
          >
            Login
          </button>
        </div>
      </form>
    </div>
  );
}

// --------------------------------------------------------------------
//        HERE IS WHERE WE KEEP THE FORM TO SIGN UP
// --------------------------------------------------------------------

function SignupForm({ onSubmit, errorMessage }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [title, setTitle] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(username, password, email, title, firstName, lastName);
  };

  return (
    <div>
      <div className="flex flex-col items-center mb-5">
        <p className="text-2xl font-bold mb-2">Signup</p>
        <p className="text-m">
          Welcome! Please enter your details to create an account
        </p>
      </div>
      {errorMessage && <p className="text-red-500">{errorMessage}</p>}
      <form onSubmit={handleSubmit}>
        <AuthFields
          isSignup={true}
          username={username}
          setUsername={setUsername}
          password={password}
          setPassword={setPassword}
          email={email}
          setEmail={setEmail}
          title={title}
          setTitle={setTitle}
          firstName={firstName}
          setFirstName={setFirstName}
          lastName={lastName}
          setLastName={setLastName}
        />
        <div className="flex justify-center">
          <button
            type="submit"
            className="mt-5 bg-blue-1000 text-white py-2 px-8 rounded-full transition duration-300 ease-in-out hover:bg-blue-1100"
          >
            Signup
          </button>
        </div>
      </form>
    </div>
  );
}

// --------------------------------------------------------------------
//      HERE IS WHERE WE KEEP THE MIXED FIELDS BETWEEN THE TWO
// --------------------------------------------------------------------

function AuthFields({
  isSignup,
  username,
  setUsername,
  password,
  setPassword,
  email,
  setEmail,
  title,
  setTitle,
  firstName,
  setFirstName,
  lastName,
  setLastName,
}) {
  return (
    <div>
      <div className="flex flex-col items-start mb-4">
        <label className="text-sm mb-1">Username</label>
        <div className="input input-bordered flex items-center gap-2 w-full">
          <input
            type="text"
            className="grow"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>
      </div>
      {isSignup && (
        <>
          <div className="flex flex-col items-start mb-4">
            <label className="text-sm mb-1">Email</label>
            <div className="input input-bordered flex items-center gap-2 w-full">
              <input
                type="email"
                className="grow"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>
          <div className="flex flex-col items-start mb-4">
            <label className="text-sm mb-1">Title</label>
            <div className="input input-bordered flex items-center gap-2 w-full">
              <input
                type="text"
                className="grow"
                placeholder="Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
          </div>
          <div className="flex flex-col items-start mb-4">
            <label className="text-sm mb-1">First Name</label>
            <div className="input input-bordered flex items-center gap-2 w-full">
              <input
                type="text"
                className="grow"
                placeholder="First Name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>
          </div>
          <div className="flex flex-col items-start mb-4">
            <label className="text-sm mb-1">Last Name</label>
            <div className="input input-bordered flex items-center gap-2 w-full">
              <input
                type="text"
                className="grow"
                placeholder="Last Name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
          </div>
        </>
      )}
      <div className="flex flex-col items-start mb-4">
        <label className="text-sm mb-1">Password</label>
        <div className="input input-bordered flex items-center gap-2 w-full">
          <input
            type="password"
            className="grow"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}
