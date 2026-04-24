import React, { useState } from "react";
import "../styles/login.css";
import { login as loginRequest, registerAlumni } from "../services/api";

import nuLogo from "../assets/nu logo left.png";
import bgImg from "../assets/nubg.jpg";
import studentBtn from "../assets/student login button.png";
import alumniBtn from "../assets/alumni login button.png";
import adminBtn from "../assets/admin login button.png";

const Login = () => {
  const [activeView, setActiveView] = useState("login");
  const [showFormPanel, setShowFormPanel] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginForm, setLoginForm] = useState({
    email: "",
    password: ""
  });
  const [registerForm, setRegisterForm] = useState({
    fullName: "",
    email: "",
    password: "",
    studentNumber: "",
    course: "",
    yearGraduated: ""
  });

  const resetMessages = () => {
    setStatusMessage("");
    setErrorMessage("");
  };

  const handleLoginChange = (event) => {
    const { name, value } = event.target;
    setLoginForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleRegisterChange = (event) => {
    const { name, value } = event.target;
    setRegisterForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleLoginSubmit = async (event) => {
    event.preventDefault();
    resetMessages();
    setIsSubmitting(true);

    try {
      const response = await loginRequest(loginForm);
      localStorage.setItem("token", response.token);
      localStorage.setItem("user", JSON.stringify(response.user));
      setStatusMessage(
        `Login successful as ${response.user.role}. Account status: ${response.user.status}.`
      );
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (event) => {
    event.preventDefault();
    resetMessages();
    setIsSubmitting(true);

    try {
      await registerAlumni({
        ...registerForm,
        yearGraduated: Number(registerForm.yearGraduated)
      });
      setStatusMessage("Registration submitted. Wait for registrar approval before login.");
      setRegisterForm({
        fullName: "",
        email: "",
        password: "",
        studentNumber: "",
        course: "",
        yearGraduated: ""
      });
      setActiveView("login");
      setShowFormPanel(false);
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-wrapper">
      <div
        className="bg-image"
        style={{
          backgroundImage: `linear-gradient(rgba(191, 194, 230, 0.5), rgba(191, 194, 230, 0.5)), url(${bgImg})`
        }}
      />
      <div className="top-logo">
        <img src={nuLogo} alt="Logo" />
      </div>
      <div className="login-card">
        <h2>LOG IN</h2>
        <div className="icon-container">
          <button
            type="button"
            className="icon-box icon-button"
            onClick={() => {
              setActiveView("login");
              setShowFormPanel(true);
            }}
          >
            <img src={studentBtn} alt="Student" />
          </button>
          <div className="divider" />
          <button
            type="button"
            className="icon-box icon-button"
            onClick={() => {
              setActiveView("register");
              setShowFormPanel(true);
            }}
          >
            <img src={alumniBtn} alt="Alumni" />
          </button>
          <div className="divider" />
          <button
            type="button"
            className="icon-box icon-button"
            onClick={() => {
              setActiveView("login");
              setShowFormPanel(true);
            }}
          >
            <img src={adminBtn} alt="Admin" />
          </button>
        </div>

        {statusMessage && <p className="status-message">{statusMessage}</p>}
        {errorMessage && <p className="error-message">{errorMessage}</p>}
      </div>

      {showFormPanel && (
        <div className="form-modal-backdrop">
          <div className="form-modal">
            <button type="button" className="close-button" onClick={() => setShowFormPanel(false)}>
              x
            </button>
            <h3>{activeView === "login" ? "Account Login" : "Alumni Registration"}</h3>
            {activeView === "login" ? (
              <form className="form-grid" onSubmit={handleLoginSubmit}>
                <input
                  name="email"
                  type="email"
                  placeholder="Email"
                  value={loginForm.email}
                  onChange={handleLoginChange}
                  required
                />
                <input
                  name="password"
                  type="password"
                  placeholder="Password"
                  value={loginForm.password}
                  onChange={handleLoginChange}
                  required
                />
                <button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Please wait..." : "Log in"}
                </button>
              </form>
            ) : (
              <form className="form-grid" onSubmit={handleRegisterSubmit}>
                <input
                  name="fullName"
                  type="text"
                  placeholder="Full name"
                  value={registerForm.fullName}
                  onChange={handleRegisterChange}
                  required
                />
                <input
                  name="email"
                  type="email"
                  placeholder="Email"
                  value={registerForm.email}
                  onChange={handleRegisterChange}
                  required
                />
                <input
                  name="password"
                  type="password"
                  placeholder="Password"
                  value={registerForm.password}
                  onChange={handleRegisterChange}
                  required
                  minLength={6}
                />
                <input
                  name="studentNumber"
                  type="text"
                  placeholder="Student number"
                  value={registerForm.studentNumber}
                  onChange={handleRegisterChange}
                  required
                />
                <input
                  name="course"
                  type="text"
                  placeholder="Course"
                  value={registerForm.course}
                  onChange={handleRegisterChange}
                  required
                />
                <input
                  name="yearGraduated"
                  type="number"
                  placeholder="Year graduated"
                  value={registerForm.yearGraduated}
                  onChange={handleRegisterChange}
                  required
                />
                <button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Please wait..." : "Submit alumni registration"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;