import express from "express";
import bodyParser from "body-parser";
import session from "express-session";
import passport from "passport";
import { Strategy } from "passport-local";
import axios from "axios";
import env from "dotenv";
import bcrypt from "bcrypt";
import pg from "pg";

// Load environment variables
env.config();

// Initialize Express app
const app = express();
const port = process.env.SERVER_PORT || 3000;
const API_URL = process.env.API_URL;
// Database connection
const db = new pg.Client({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});
db.connect();

// Middleware setup
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(
    session({
        secret: process.env.SESSION_SECRET || 'PMP', // Session secret key
        resave: false,
        saveUninitialized: true,
        cookie: {
            maxAge: 1000 * 60 * 60 * 24, // 1 day in milliseconds
            secure: false, // Change to true in production with HTTPS
            httpOnly: true, // Prevent client-side access to cookies
            sameSite: 'strict' // Mitigate CSRF attacks
        }
    })
);

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Passport configuration
passport.use("local",
    new Strategy(async (username, password, done) => {
        try {
            const result = await db.query("SELECT * FROM users WHERE username = $1", [
                username,
            ]);

            if (result.rows.length === 0) {
                // No user found with the given username
                return done(null, false);
            }

            const user = result.rows[0];
            // Compare hashed password with the provided password
            bcrypt.compare(password, user.password, (err, isMatch) => {
                if (err) {
                    console.error("Error comparing passwords:", err);
                    return done(err);
                }
                if (!isMatch) {
                    // Passwords do not match
                    return done(null, false);
                }
                // Authentication successful
                return done(null, user);
            });
        } catch (error) {
            console.error("Error during login:", error);
            return done(error);
        }
    })
);


passport.serializeUser((user, done) => {
    console.log("Serializing user:", user.id);
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        console.log("Deserializing user with ID:", id);
        const user = await db.query('SELECT * FROM users WHERE id = $1', [id]);
        done(null, user.rows[0]);
    } catch (err) {
        console.error("Error deserializing user:", err);
        done(err);
    }
});

// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
        console.log("User is authenticated");
        // User is authenticated, proceed to the next middleware
        return next();
    } else {
        console.log("User is not authenticated");
        // User is not authenticated, redirect to login page
        res.redirect("/login");
    }
};


// Rendering functions
async function renderLoginPage(req, res) {
    try {
        res.render("login.ejs");
    } catch (error) {
        console.error("Error rendering login page:", error);
        res.status(500).redirect("/");
    }
}

async function renderUserManagementPage(req, res) {
    try {
        const usersResponse = await axios.get(`${API_URL}/users/view`);
        const projectsResponse = await axios.get(`${API_URL}/projects`);
        res.render("newUser.ejs", { 
            heading: "User Management", 
            submit: "Add User", 
            users: usersResponse.data,
            projects: projectsResponse.data
        });
    } catch (error) {
        console.error("Error fetching user or projects data:", error);
        res.render("newUser.ejs", { heading: "User Management", error: "Failed to find users or projects." });
    }
}

async function renderProjectManagementPage(req, res) {
    try {
        const projectsResponse = await axios.get(`${API_URL}/projects`);
        res.render("projectManagement.ejs", { 
            heading: "Project Management", 
            projects: projectsResponse.data
        });
    } catch (error) {
        console.error("Error fetching user or projects data:", error);
        res.render("projectManagement.ejs", { heading: "Team Management", error: "Failed to find users or projects." });
    }
}


async function renderDashboard(req, res) {
    try {
        const summaryResponse = await axios.get(`${API_URL}/project_summary/view`);
        res.render("dashboard.ejs", { data: summaryResponse.data });
    } catch (error) {
        console.error("Error rendering dashboard:", error);
        res.status(500).redirect("/pendingprojects");
    }
}

async function renderPendingProjects(req, res) {
    try {
        const response = await axios.get(`${API_URL}/status/view`);
        const response2 = await axios.get(`${API_URL}/pendingprojects`);
        res.render("pendingProjects.ejs", { project: response.data, data: response2.data });
    } catch (error) {
        console.error("Error fetching pending projects data:", error);
        res.render("pendingProjects.ejs", { error: "Error fetching pending projects data", pendingProjects: [] });
    }
}

async function renderActiveProjects(req, res) {
    try {
        const response = await axios.get(`${API_URL}/status/view`);
        const response2 = await axios.get(`${API_URL}/activeprojects`);
        res.render("activeProjects.ejs", { project: response.data, projects: response2.data, activeProjects: response.data });
    } catch (error) {
        console.error("Error fetching active projects data:", error);
        res.render("activeProjects.ejs", { error: "Error fetching active projects data", projects: [], activeProjects: [] });
    }
}

async function renderUserIndexPage(req, res) {
    try {
        res.render("userIndex.ejs");
    } catch (error) {
        console.error("Error fetching user or projects data:", error);
    }
}

async function renderCharterPage(req, res) {
    try {
        const response = await axios.get(`${API_URL}/charters`);
        const charterData = response.data;
        const projectsResponse = await axios.get(`${API_URL}/projects`);
        const projectsData = projectsResponse.data;
        res.render("charter.ejs", { projects: projectsData, charterData: charterData });
    } catch (error) {
        console.error("Error fetching user or projects data:", error);
        res.status(500).send("Error fetching data");
    }
}

// Adding functions
async function addUser(req, res) {
    try {
        const { username, password, permissions_id, roles_id} = req.body;
        await axios.post(`${API_URL}/users/add`, { username, password, permissions_id, roles_id });
        res.redirect("/");
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).render("newUser.ejs", { heading: "User Management", error: "Failed to add user." });
    }
}

async function addProject(req, res) {
    try {
        const { project_name, status} = req.body;
        await axios.post(`${API_URL}/projects/add`, { project_name, status });
        res.redirect("/ProjectManagement");
    } catch (error) {
        console.error('Error creating project:', error);
        res.status(500).redirect("/ProjectManagement");
    }
}

async function assignProject(req, res) {
    try {
        const { project_id, user_id} = req.body;
        await axios.post(`${API_URL}/project/members/add`, { project_id, user_id });
        res.redirect("/users");
    } catch (error) {
        console.error('Error creating project:', error);
        res.status(500).redirect("/users");
    }
}

async function addToActive(req, res) {
    try {
        const { project_id, charter_id, submitter_id, pending_project_id } = req.body;
        await axios.post(`${API_URL}/activeprojects/add`, { project_id, charter_id, submitter_id});
        await axios.delete(`${API_URL}/pendingprojects/${pending_project_id}/delete`);
        res.redirect("/activeProjects");
    } catch (error) {
        console.error('Error adding project to Active:', error);
        res.status(500).redirect(500 ,"/pendingProjects", { error: "Failed to add project to Active." });
    }
}

// Editing function
async function editUser(req, res) {
    try {
        const userId = req.params.id;
        const { username, password, permissions_id, roles_id } = req.body;
        const data = { username, password, permissions_id, roles_id };
        await axios.patch(`${API_URL}/users/${userId}/edit`, data); 
        res.redirect("/users");
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).redirect("/users");
    }
}

async function editProject(req, res) {
    try {
        const projectId = req.params.id;
        console.log(projectId);
        const { project_name, status } = req.body;
        const data = { project_name, status };
        console.log(data);
        await axios.patch(`${API_URL}/projects/${projectId}/edit`, data); 
        res.redirect("/ProjectManagement");
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).redirect("/ProjectManagement");
    }
}

// Deleting functions
async function deleteUser(req, res) {
    try {
        const userId = req.params;
        const projectId = req.body;
        const projectIds = projectId.project_id.split(',');
        projectIds.forEach(async (projectId) => {
            await axios.delete(`${API_URL}/project/members/remove/${projectId}/${userId.id}`);
        });
        await axios.delete(`${API_URL}/users/${userId.id}/delete`);
        res.redirect("/users");
    } catch (error) {
        console.error('Error deleting user:', error);
        res.redirect(500, "/users", { heading: "User Management", error: "Failed to delete user." });
    }
}

async function deleteProject(req, res) {
    try {
        const projectId = req.params.id;
        await axios.delete(`${API_URL}/projects/${projectId}/delete`);
        res.redirect("/ProjectManagement");
    } catch (error) {
        console.error('Error deleting user:', error);
        res.redirect(500, "/ProjectManagement");
    }
}

async function deleteAssignedProjects(req, res) {
    try {
        const userId = req.params;
        const projectId = req.body;
        const projectIds = projectId.project_id.split(',');
        projectIds.forEach(async (projectId) => {
            await axios.delete(`${API_URL}/project/members/remove/${projectId}/${userId.id}`);
        });
        res.redirect("/users");
    } catch (error) {
        console.error('Error deleting projects:', error);
        res.redirect("/users");
    }
}

// Routes
app.get("/users", isAuthenticated, renderUserManagementPage);
app.get("/pendingprojects", isAuthenticated, renderPendingProjects);
app.get("/activeprojects", isAuthenticated, renderActiveProjects);
app.get("/dashboard", isAuthenticated, renderDashboard);
app.get("/index", isAuthenticated, renderUserIndexPage);
app.get("/charter", isAuthenticated, renderCharterPage);
app.get("/ProjectManagement", isAuthenticated, renderProjectManagementPage)
app.get("/", renderLoginPage);

app.post("/login", (req, res, next) => {
    passport.authenticate("local", (err, user, info) => {
      if (err) {
        // Handle error
        return res.redirect("/login");
      }
      if (!user) {
        // Authentication failed due to incorrect username or password
        // Redirect user back to login page with a custom error message
        return res.redirect("/login?error=Incorrect username or password");
      }
      // Authentication successful, redirect to dashboard
      req.logIn(user, (err) => {
        if (err) {
          // Handle error
          console.log(err);
          return res.redirect("/login");
        }
        console.log("logged in")
        return res.redirect("/dashboard");
      });
    })(req, res, next);
  });
  

  app.get("/login", (req, res) => {
    const errorMessage = req.query.error ? req.query.error : null;
    res.render("login.ejs", { error: errorMessage });
  });

  
//LogOut 
app.get("/logout", (req, res) => {
  
    req.logout(function (err) {
      if (err) {
        return next(err);
      }
      res.redirect("/");
    })
  });
  

app.post("/users/add", addUser);
app.post("/users/:id/edit", editUser);
app.post("/users/:id/delete", deleteUser);
app.post("/activeprojects/add", addToActive);
app.post("/projects/add", addProject);
app.post("/project/members/add", assignProject);
app.post("/users/:id/delete/projects", deleteAssignedProjects);
app.post("/projects/:id/edit", editProject);
app.post("/projects/:id/delete", deleteProject);

// Start the server
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
