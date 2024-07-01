// Importing required modules
import express from 'express';
import bodyParser from 'body-parser';
import session from 'express-session';
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import axios from 'axios';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import pg from 'pg';

// Load environment variables
dotenv.config();

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
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'PMP',
    resave: false,
    saveUninitialized: true,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24,
      secure: false, // Change to true in production with HTTPS
      httpOnly: true,
      sameSite: 'strict',
    },
  })
);

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Passport configuration
passport.use(
  'local',
  new LocalStrategy(async (username, password, done) => {
    try {
      const result = await db.query('SELECT * FROM users WHERE username = $1', [
        username,
      ]);

      if (result.rows.length === 0) {
        return done(null, false);
      }

      const user = result.rows[0];
      bcrypt.compare(password, user.password, (err, isMatch) => {
        if (err) {
          console.error('Error comparing passwords:', err);
          return done(err);
        }
        if (!isMatch) {
          return done(null, false);
        }
        return done(null, user);
      });
    } catch (error) {
      console.error('Error during login:', error);
      return done(error);
    }
  })
);

passport.serializeUser((user, done) => {
  console.log('Serializing user:', user.id);
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    console.log('Deserializing user with ID:', id);
    const user = await db.query('SELECT * FROM users WHERE id = $1', [id]);
    done(null, user.rows[0]);
  } catch (err) {
    console.error('Error deserializing user:', err);
    done(err);
  }
});

// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    console.log('User is authenticated');
    return next();
  } else {
    console.log('User is not authenticated');
    res.redirect('/login');
  }
};

// Rendering functions
const renderLoginPage = async (req, res) => {
  try {
    res.render('login.ejs');
  } catch (error) {
    console.error('Error rendering login page:', error);
    res.status(500).redirect('/');
  }
};

const renderUserManagementPage = async (req, res) => {
  try {
    const usersResponse = await axios.get(`${API_URL}/users/view`);
    const projectsResponse = await axios.get(`${API_URL}/projects`);
    res.render('newUser.ejs', {
      heading: 'User Management',
      submit: 'Add User',
      users: usersResponse.data,
      projects: projectsResponse.data,
    });
  } catch (error) {
    console.error('Error fetching user or projects data:', error);
    res.render('newUser.ejs', {
      heading: 'User Management',
      error: 'Failed to find users or projects.',
    });
  }
};

const renderCharterInfo = async (req, res) => {
  try {
      const projectId = req.params.id; 
      if (!projectId) {
          return res.status(400).json({ error: 'Project ID is required' });
      }
      console.log('Fetching charter data for projectId:', projectId);
      
      const response = await axios.get(`${API_URL}/charters/${projectId}`);
      const projectsResponse = await axios.get(`${API_URL}/users/view`);
      const projectsData = projectsResponse.data;

      res.render("charter.ejs", {
          projects: projectsData, 
          username: req.user.username,  
          userId: req.user.id,  
      });

  } catch (error) {
      console.error('Error fetching charter data:', error);
      res.status(500).json({ error: 'Failed to fetch charter data' });
  }
};


const renderProjectManagementPage = async (req, res) => {
  try {
    const projectsResponse = await axios.get(`${API_URL}/projects`);
    res.render('projectManagement.ejs', {
      heading: 'Project Management',
      projects: projectsResponse.data,
    });
  } catch (error) {
    console.error('Error fetching user or projects data:', error);
    res.render('projectManagement.ejs', {
      heading: 'Team Management',
      error: 'Failed to find users or projects.',
    });
  }
};

const renderDashboard = async (req, res) => {
  try {
    const summaryResponse = await axios.get(`${API_URL}/project_summary/view`);
    res.render('dashboard.ejs', { data: summaryResponse.data });
  } catch (error) {
    console.error('Error rendering dashboard:', error);
    res.status(500).redirect('/pendingprojects');
  }
};

const renderPendingProjects = async (req, res) => {
  try {
    const response = await axios.get(`${API_URL}/status/view`);
    const response2 = await axios.get(`${API_URL}/pendingprojects`);
    res.render('pendingProjects.ejs', {
      project: response.data,
      data: response2.data,
    });
  } catch (error) {
    console.error('Error fetching pending projects data:', error);
    res.render('pendingProjects.ejs', {
      error: 'Error fetching pending projects data',
      pendingProjects: [],
    });
  }
};

const renderActiveProjects = async (req, res) => {
  try {
    const response = await axios.get(`${API_URL}/status/view`);
    const response2 = await axios.get(`${API_URL}/activeprojects`);
    res.render('activeProjects.ejs', {
      project: response2.data,
      projects: response2.data,
      activeProjects: response.data,
    });
  } catch (error) {
    console.error('Error fetching active projects data:', error);
    res.render('activeProjects.ejs', {
      error: 'Error fetching active projects data',
      projects: [],
      activeProjects: [],
    });
  }
};

const renderActivitiesPage = async (req, res) => {
  try {
    res.render('activities.ejs');
  } catch (error) {
    console.error('Error fetching user or projects data:', error);
  }
}

const renderUserIndexPage = async (req, res) => {
  try {
    res.render('userIndex.ejs');
  } catch (error) {
    console.error('Error fetching user or projects data:', error);
  }
};

const renderCharterPage = async (req, res) => {
  try {
    const response = await axios.get(`${API_URL}/charters`);
    const charterData = response.data;
    const projectsResponse = await axios.get(`${API_URL}/users/view`);
    const projectsData = projectsResponse.data;

    res.render('charter.ejs', {
      username: req.user.username,  
      userId: req.user.id,          
      projects: projectsData,
      charterData: charterData,
    });
  } catch (error) {
    console.error('Error fetching user or projects data:', error);
    res.status(500).send('Error fetching data');
  }
};

const renderProjectClosurePage = async (req, res) => {
  try {
    const response = await axios.get(`${API_URL}/project_closures`);
    const closureData = response.data;
    const projectsResponse = await axios.get(`${API_URL}/users/view`);
    const projectsData = projectsResponse.data;

    res.render('projectClosure.ejs', {
      username: req.user.username,  
      userId: req.user.id,          
      projects: projectsData,
      closureData: closureData,
    });
  } catch (error) {
    console.error('Error fetching user or projects data:', error);
    res.status(500).send('Error fetching data');
  }
};

const renderActivityFormPage = async (req, res) => {
  try {
    const response = await axios.get(`${API_URL}/activity_forms`);
    const formData = response.data;
    const projectsResponse = await axios.get(`${API_URL}/users/view`);
    const projectsData = projectsResponse.data;

    res.render('activityForm.ejs', {
      username: req.user.username,  
      userId: req.user.id,          
      projects: projectsData,
      formData: formData,
    });
  } catch (error) {
    console.error('Error fetching user or projects data:', error);
    res.status(500).send('Error fetching data');
  }
};


const renderActivityClosurePage = async (req, res) => {
  try {
    const response = await axios.get(`${API_URL}/activity_closures`);
    const closureData = response.data;
    const projectsResponse = await axios.get(`${API_URL}/users/view`);
    const projectsData = projectsResponse.data;

    res.render('activityClosure.ejs', {
      username: req.user.username,  
      userId: req.user.id,          
      projects: projectsData,
      closureData: closureData,
    });
  } catch (error) {
    console.error('Error fetching user or projects data:', error);
    res.status(500).send('Error fetching data');
  }
};

// Adding functions
const addUser = async (req, res) => {
  try {
    const { username, password, permissions_id, roles_id } = req.body;
    await axios.post(`${API_URL}/users/add`, {
      username,
      password,
      permissions_id,
      roles_id,
    });
    res.redirect(200, '/users');
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).render('newUser.ejs', {
      heading: 'User Management',
      error: 'Failed to add user.',
    });
  }
};

const addProject = async (req, res) => {
  try {
    const { project_name, status } = req.body;
    await axios.post(`${API_URL}/projects/add`, { project_name, status });
    res.redirect('/ProjectManagement');
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).redirect('/ProjectManagement');
  }
};

const addCharter = async (req, res) => {
  try {
    const {
      project_id,
      start_date,
      end_date,
      description,
      kpis,
      risks,
      mitigation_strategies,
      target_participants,
      submitter_name
    } = req.body;

    const charter = {
      project_id,
      start_date,
      end_date,
      description: description,
      kpis,
      risks,
      mitigation_strategies,
      target_participants,
      submitter_name
    };

    console.log('Sending charter:', charter);

    await axios.post(`${API_URL}/charters/add`, charter);
    
    res.redirect('/charter');
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).redirect('/index');
  }
};

const addActivityForm = async (req, res) => {
  try {
    const {
      project_id,
      start_date,
      end_date,
      description,
      kpis,
      risks,
      mitigation_strategies,
      target_participants,
      submitter_name
    } = req.body;

    const form = {
      project_id,
      start_date,
      end_date,
      description: description,
      kpis,
      risks,
      mitigation_strategies,
      target_participants,
      submitter_name
    };

    console.log('Sending activity Form:', form);

    await axios.post(`${API_URL}/activity_forms/add`, form);
    
    res.redirect('/activity_form');
  } catch (error) {
    console.error('Error creating activity form:', error);
    res.status(500).redirect('/activities');
  }
};

const addProjectClosure = async (req, res) => {
  try {
    const {
      project_id,
      start_date,
      end_date,
      project_feedback,
      lessons_learned,
      kpis,
      risks,
      mitigation_strategies,
      total_male_participants,
      total_female_participants
    } = req.body;

    const projectClosure = {
      project_id,
      start_date,
      end_date,
      project_feedback,
      lessons_learned,
      kpis,
      risks,
      mitigation_strategies,
      total_male_participants,
      total_female_participants
    };

    console.log('Sending project clsoure:', projectClosure);

    await axios.post(`${API_URL}/project_closures/add`, projectClosure);
    
    res.redirect('/closure');
  } catch (error) {
    console.error('Error creating closure:', error);
    res.status(500).redirect('/index');
  }
};

const addActivityClosure = async (req, res) => {
  try {
    const {
      project_id,
      start_date,
      end_date,
      description,
      kpis,
      risks,
      mitigation_strategies,
      total_male_participants,
      total_female_participants,
      submitter_name
    } = req.body;

    const Closure = {
      project_id,
      start_date,
      end_date,
      description,
      kpis,
      risks,
      mitigation_strategies,
      total_male_participants,
      total_female_participants,
      submitter_name
    };

    console.log('Adding Activity Closure:', Closure);

    await axios.post(`${API_URL}/activity_closures/add`, Closure);
    
    res.redirect('/activity_closure');
  } catch (error) {
    console.error('Error Adding Project:', error);
    res.status(500).redirect('/activities');
  }
};

const assignProject = async (req, res) => {
  try {
    const { project_id, user_id } = req.body;
    await axios.post(`${API_URL}/project/members/add`, {
      project_id,
      user_id,
    });
    res.redirect('/users');
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).redirect('/users');
  }
};

const addToActive = async (req, res) => {
  try {
    const { project_id, charter_id, submitter_id, pending_project_id } = req.body;
    await axios.post(`${API_URL}/activeprojects/add`, {
      project_id,
      charter_id,
      submitter_id,
    });
    await axios.delete(`${API_URL}/pendingprojects/${project_id}/delete`);
    res.redirect('/activeProjects');
  } catch (error) {
    console.error('Error adding project to Active:', error);
    res.status(500).redirect('/pendingProjects', {
      error: 'Failed to add project to Active.',
    });
  }
};

// Editing functions

//Charter Edit
const editCharter = async (req, res) => {
  try {
    const {
      project_id,
      start_date,
      end_date,
      description,
      kpis,
      risks,
      mitigation_strategies,
      target_participants,
      submitter_name,
      charter_id 
    } = req.body;
    const charter = {
      project_id,
      start_date,
      end_date,
      description,
      kpis,
      risks,
      mitigation_strategies,
      target_participants,
      submitter_name
    };

    console.log('Updating charter:', charter);

    await axios.patch(`${API_URL}/charters/${project_id}/edit`, charter);
    
    res.redirect('/charter');
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).redirect('/index');
  }
};

//Charter Edit
const editActivityForm = async (req, res) => {
  try {
    const {
      project_id,
      start_date,
      end_date,
      description,
      kpis,
      risks,
      mitigation_strategies,
      target_participants,
      submitter_name, 
    } = req.body;

    const form = {
      project_id,
      start_date,
      end_date,
      description,
      kpis,
      risks,
      mitigation_strategies,
      target_participants,
      submitter_name
    };

    console.log('Updating activity form:', form);

    await axios.patch(`${API_URL}/activity_forms/${project_id}/edit`, form);
    
    res.redirect('/activity_form');
  } catch (error) {
    console.error('Error updating activity form:', error);
    res.status(500).redirect('/activities');
  }
};

const editUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const { username, password, permissions_id, roles_id } = req.body;
    const data = { username, password, permissions_id, roles_id };
    await axios.patch(`${API_URL}/users/${userId}/edit`, data);
    res.redirect('/users');
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).redirect('/users');
  }
};

const editProject = async (req, res) => {
  try {
    const projectId = req.params.id;
    console.log(projectId);
    const { project_name, status } = req.body;
    const data = { project_name, status };
    console.log(data);
    await axios.patch(`${API_URL}/projects/${projectId}/edit`, data);
    res.redirect('/ProjectManagement');
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).redirect('/ProjectManagement');
  }
};

const editProjectClosure = async (req, res) => {
  try {
    const {
      project_id,
      start_date,
      end_date,
      project_feedback,
      lessons_learned,
      kpis,
      risks,
      mitigation_strategies,
      total_male_participants,
      total_female_participants,
      submitter_name
    } = req.body;

    const projectClosure = {
      project_id,
      start_date,
      end_date,
      project_feedback,
      lessons_learned,
      kpis,
      risks,
      mitigation_strategies,
      total_male_participants,
      total_female_participants,
      submitter_name
    };

    console.log('Updating Project Closure:', projectClosure);

    await axios.patch(`${API_URL}/project_closures/${project_id}/edit`, projectClosure);
    
    res.redirect('/closure');
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).redirect('/index');
  }
};

const editActivityClosure = async (req, res) => {
  try {
    const {
      project_id,
      start_date,
      end_date,
      description,
      kpis,
      risks,
      mitigation_strategies,
      total_male_participants,
      total_female_participants,
      submitter_name
    } = req.body;

    const Closure = {
      project_id,
      start_date,
      end_date,
      description,
      kpis,
      risks,
      mitigation_strategies,
      total_male_participants,
      total_female_participants,
      submitter_name
    };

    console.log('Updating Activity Closure:', Closure);

    await axios.patch(`${API_URL}/activity_closures/${project_id}/edit`, Closure);
    
    res.redirect('/activityclosure');
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).redirect('/activities');
  }
};

// Deleting functions
const deleteUser = async (req, res) => {
  try {
    const userId = req.params;
    const projectId = req.body;

    if (projectId.project_id) {
      const projectIds = projectId.project_id.split(',');
      for (const projectId of projectIds) {
        if (projectId) {
          await axios.delete(`${API_URL}/project/members/remove/${projectId}/${userId.id}`);
        }
      }
    }

    await axios.delete(`${API_URL}/users/${userId.id}/delete`);
    res.redirect('/users');
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).redirect('/users', {
      heading: 'User Management',
      error: 'Failed to delete user.',
    });
  }
};

const deleteProject = async (req, res) => {
  try {
    const projectId = req.params.id;
    await axios.delete(`${API_URL}/projects/${projectId}/delete`);
    res.redirect('/ProjectManagement');
  } catch (error) {
    console.error('Error deleting user:', error);
    res.redirect(500, '/ProjectManagement');
  }
};

const deleteAssignedProjects = async (req, res) => {
  try {
    const userId = req.params;
    const projectId = req.body;
    const projectIds = projectId.project_id.split(',');
    projectIds.forEach(async (projectId) => {
      await axios.delete(`${API_URL}/project/members/remove/${projectId}/${userId.id}`);
    });
    res.redirect('/users');
  } catch (error) {
    console.error('Error deleting projects:', error);
    res.redirect('/users');
  }
};

// Routes
app.get('/users', isAuthenticated, renderUserManagementPage);
app.get('/pendingprojects', isAuthenticated, renderPendingProjects);
app.get('/activeprojects', isAuthenticated, renderActiveProjects);
app.get('/dashboard', isAuthenticated, renderDashboard);
app.get('/index', isAuthenticated, renderUserIndexPage);
app.get('/charter', isAuthenticated, renderCharterPage);
app.get('/ProjectManagement', isAuthenticated, renderProjectManagementPage);
app.get('/', renderLoginPage);
app.get('/charters/:id', isAuthenticated, renderCharterInfo);
app.get('/closure', isAuthenticated, renderProjectClosurePage);
app.get('/activities', isAuthenticated, renderActivitiesPage);
app.get('/activity_form', isAuthenticated, renderActivityFormPage);
app.get('/activity_closure', isAuthenticated, renderActivityClosurePage);

app.post('/login', (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) {
      return res.redirect('/login');
    }
    if (!user) {
      return res.redirect('/login?error=Incorrect username or password');
    }
    req.logIn(user, (err) => {
      if (err) {
        console.log(err);
        return res.redirect('/login');
      }
      console.log('logged in');
      if (user.role_id === 1) {
        return res.redirect('/dashboard');
      } else if (user.role_id === 2 || user.role_id === 3) {
        return res.redirect('/index');
      } else {
        return res.redirect('/login');
      }
    });
  })(req, res, next);
});

app.get('/login', (req, res) => {
  const errorMessage = req.query.error ? req.query.error : null;
  res.render('login.ejs', { error: errorMessage });
});

app.get('/logout', (req, res) => {
  req.logout(function (err) {
    if (err) {
      return next(err);
    }
    res.redirect('/');
  });
});

app.post('/users/add', addUser);
app.post('/users/:id/edit', editUser);
app.post('/users/:id/delete', deleteUser);
app.post('/activeprojects/add', addToActive);
app.post('/projects/add', addProject);
app.post('/project/members/add', assignProject);
app.post('/users/:id/delete/projects', deleteAssignedProjects);
app.post('/projects/:id/edit', editProject);
app.post('/projects/:id/delete', deleteProject);
app.post('/charters/add', addCharter);
app.post('/charters/edit', editCharter);
app.post('/closure/add', addProjectClosure);
app.post('/closure/edit', editProjectClosure);
app.post('/activity_forms/add', addActivityForm);
app.post('/activity_form/edit', editActivityForm);
app.post('/activity_closure/add', addActivityClosure);
app.post('/activity_closure/edit', editActivityClosure);

// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
