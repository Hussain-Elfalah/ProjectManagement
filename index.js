import express from "express";
import pg from "pg";
import bodyParser from "body-parser";
import bcrypt from "bcrypt";
import env from "dotenv";

const app = express();
const port = process.env.PORT || 4000;
env.config();

const db = new pg.Client({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

db.connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// --------------------------------------- PERMISSIONS ---------------------------------------------------
// Create a new permission
app.post('/permissions/add', async (req, res) => {
    const { can_create, can_delete, can_edit } = req.body;
    const query = 'INSERT INTO permissions (can_create, can_delete, can_edit) VALUES ($1, $2, $3) RETURNING *';
    const values = [can_create, can_delete, can_edit];
    try {
      const result = await db.query(query, values);
      res.json(result.rows[0]);
    } catch (err) {
      console.error('Error executing query', err);
      res.status(500).send('Error creating permission');
    }
  });
  
  // Get all permissions
  app.get('/permissions', async (req, res) => {
    try {
      const result = await db.query('SELECT * FROM permissions');
      res.json(result.rows);
    } catch (err) {
      console.error('Error executing query', err);
      res.status(500).send('Error retrieving permissions');
    }
  });
  
  // Update a permission
  app.put('/permissions/:id/edit', async (req, res) => {
    const { id } = req.params;
    const { can_create, can_delete, can_edit } = req.body;
    const query = 'UPDATE permissions SET can_create = $1, can_delete = $2, can_edit = $3 WHERE id = $4 RETURNING *';
    const values = [can_create, can_delete, can_edit, id];
    try {
      const result = await db.query(query, values);
      res.json(result.rows[0]);
    } catch (err) {
      console.error('Error executing query', err);
      res.status(500).send('Error updating permission');
    }
  });
  
  // Delete a permission
  app.delete('/permissions/:id/delete', async (req, res) => {
    const { id } = req.params;
    const query = 'DELETE FROM permissions WHERE id = $1';
    const values = [id];
    try {
      await db.query(query, values);
      res.send('Permission deleted successfully');
    } catch (err) {
      console.error('Error executing query', err);
      res.status(500).send('Error deleting permission');
    }
  });

  // --------------------------------------- ROLES ---------------------------------------------------
  // Create a new role
app.post('/roles/add', async (req, res) => {
    const { role_name } = req.body;
    const query = 'INSERT INTO roles (role_name) VALUES ($1) RETURNING *';
    const values = [role_name];
    try {
      const result = await db.query(query, values);
      res.json(result.rows[0]);
    } catch (err) {
      console.error('Error executing query', err);
      res.status(500).send('Error creating role');
    }
  });
  
  // Get all roles
  app.get('/roles', async (req, res) => {
    try {
      const result = await db.query('SELECT * FROM roles');
      res.json(result.rows);
    } catch (err) {
      console.error('Error executing query', err);
      res.status(500).send('Error retrieving roles');
    }
  });
  
  // Update a role
  app.put('/roles/:id/edit', async (req, res) => {
    const { id } = req.params;
    const { role_name } = req.body;
    const query = 'UPDATE roles SET role_name = $1 WHERE id = $2 RETURNING *';
    const values = [role_name, id];
    try {
      const result = await db.query(query, values);
      res.json(result.rows[0]);
    } catch (err) {
      console.error('Error executing query', err);
      res.status(500).send('Error updating role');
    }
  });
  
  // Delete a role
  app.delete('/roles/:id/delete', async (req, res) => {
    const { id } = req.params;
    const query = 'DELETE FROM roles WHERE id = $1';
    const values = [id];
    try {
      await db.query(query, values);
      res.send('Role deleted successfully');
    } catch (err) {
      console.error('Error executing query', err);
      res.status(500).send('Error deleting role');
    }
  });

  // --------------------------------------- USERS ---------------------------------------------------
// Create a new user
app.post('/users/add', async (req, res) => {
  const { username, password, permissions_id, roles_id } = req.body;

  try {
      // Hash the password
      const hashedPassword = await bcrypt.hash(password, 10); // Salt rounds: 10

      // Prepare the SQL query
      const query = 'INSERT INTO users (username, password, permissions_id, role_id) VALUES ($1, $2, $3, $4)';
      const values = [username, hashedPassword, permissions_id, roles_id];

      // Execute the query with the provided values
      const result = await db.query(query, values);

      // Respond with the inserted user's information
      res.json(result.rows[0]);
  } catch (err) {
      console.error('Error executing query', err);
      res.status(500).send('Error creating user');
  }
});
  
  // Get all users
  app.get('/users', async (req, res) => {
    try {
      const result = await db.query('SELECT * FROM users');
      res.json(result.rows);
    } catch (err) {
      console.error('Error executing query', err);
      res.status(500).send('Error retrieving users');
    }
  });

  // Update a user
  app.patch('/users/:id/edit', async (req, res) => {
    const { id } = req.params;
    const { username, password, permissions_id, roles_id } = req.body;

    try {
        let setClause = ''; // Initialize an empty string for SET clause
        
        // Check each field and append to SET clause if present
        if (username !== undefined) {
            setClause += `username = '${username}', `;
        }
        if (password !== undefined) {
            // Hash the new password
            const hashedPassword = await bcrypt.hash(password, 10); // Salt rounds: 10
            setClause += `password = '${hashedPassword}', `;
        }
        if (permissions_id !== undefined) {
            setClause += `permissions_id = ${permissions_id}, `;
        }
        if (roles_id !== undefined) {
            setClause += `role_id = ${roles_id}, `;
        }
        
        // Remove the trailing comma and space from the SET clause
        setClause = setClause.slice(0, -2);
        
        // Construct the UPDATE query dynamically
        const query = `UPDATE users SET ${setClause} WHERE id = ${id}`;
        
        // Execute the query
        const result = await db.query(query);
        
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error executing query', err);
        res.status(500).send('Error updating user');
    }
});

  // Delete a user
  app.delete('/users/:id/delete', async (req, res) => {
    const { id } = req.params;
    const query = 'DELETE FROM users WHERE id = $1';
    const values = [id];
    try {
      await db.query(query, values);
      res.send('User deleted successfully');
    } catch (err) {
      console.error('Error executing query', err);
      res.status(500).send('Error deleting user');
    }
  });

 // --------------------------------------- PROJECTS ---------------------------------------------------
// Create a new project
app.post('/projects/add', async (req, res) => {
    const { project_name, status } = req.body;
    const query = 'INSERT INTO projects (project_name, status) VALUES ($1, $2)';
    const values = [project_name, status];
    try {
      const result = await db.query(query, values);
      res.json(result.rows[0]);
    } catch (err) {
      console.error('Error executing query', err);
      res.status(500).send('Error creating project');
    }
  });
  
  // Get all projects
  app.get('/projects', async (req, res) => {
    try {
      const result = await db.query('SELECT * FROM projects');
      res.json(result.rows);
    } catch (err) {
      console.error('Error executing query', err);
      res.status(500).send('Error retrieving projects');
    }
  });
  
  // Update a project
app.patch('/projects/:id/edit', async (req, res) => {
  const { id } = req.params;
  const { project_name, status } = req.body;
  const query = 'UPDATE projects SET project_name = $1, status = $2 WHERE id = $3';
  const values = [project_name, status, id]; // Corrected values array
  try {
      const result = await db.query(query, values);
      res.json(result.rows[0]);
  } catch (err) {
      console.error('Error executing query', err);
      res.status(500).send('Error updating project');
  }
});

  
  // Delete a project
  app.delete('/projects/:id/delete', async (req, res) => {
    const { id } = req.params;
    const query = 'DELETE FROM projects WHERE id = $1';
    const values = [id];
    try {
      await db.query(query, values);
      res.send('Project deleted successfully');
    } catch (err) {
      console.error('Error executing query', err);
      res.status(500).send('Error deleting project');
    }
  });

// --------------------------------------- PROJECT MEMBERS ---------------------------------------------------
  // Add a user to a project
app.post('/project/members/add', async (req, res) => {
  const { project_id, user_id } = req.body;
  const query = 'INSERT INTO project_members (project_id, user_id) VALUES ($1, $2) RETURNING *';
  const values = [project_id, user_id];
  try {
      const result = await db.query(query, values);
      res.json(result.rows[0]);
  } catch (err) {
      console.error('Error executing query', err);
      res.status(500).send('Error adding user to project');
  }
});

// Get all members of a project
app.get('/project/members/:project_id', async (req, res) => {
  const { project_id } = req.params;
  const query = 'SELECT * FROM project_members WHERE project_id = $1';
  const values = [project_id];
  try {
      const result = await db.query(query, values);
      res.json(result.rows);
  } catch (err) {
      console.error('Error executing query', err);
      res.status(500).send('Error retrieving project members');
  }
});

// Remove a user from a project
app.delete('/project/members/remove/:project_id/:user_id', async (req, res) => {
  const { project_id, user_id } = req.params;
  const query = 'DELETE FROM project_members WHERE project_id = $1 AND user_id = $2';
  const values = [project_id, user_id];
  try {
      await db.query(query, values);
      res.send('User removed from project successfully');
  } catch (err) {
      console.error('Error executing query', err);
      res.status(500).send('Error removing user from project');
  }
});

// --------------------------------------- Charter ---------------------------------------------------
// Create a new charter
app.post('/charters/add', async (req, res) => {
  const { start_date, end_date, project_id, description, kpis, risks, mitigation_strategies, target_participants, submitter_name } = req.body;
  const query = 'INSERT INTO charter (start_date, end_date, project_id, description, kpis, risks, mitigation_strategies, target_participants, submitter_name) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)';
  const values = [start_date, end_date, project_id, description, kpis, risks, mitigation_strategies, target_participants, submitter_name];
  try {
    console.log(start_date, end_date, project_id, description, kpis, risks, mitigation_strategies, target_participants, submitter_name);
      const result = await db.query(query, values);
      res.json(result.rows[0]);
  } catch (err) {
      console.error('Error executing query', err);
      res.status(500).send('Error creating charter');
  }
});
  
  // Get all charters
  app.get('/charters', async (req, res) => {
    try {
      const result = await db.query('SELECT * FROM charter');
      res.json(result.rows);
    } catch (err) {
      console.error('Error executing query', err);
      res.status(500).send('Error retrieving charters');
    }
  });

  // Get specific charter 
  app.get('/charters/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const result = await db.query('SELECT * FROM charter where project_id = $1', [id]);
      res.json(result.rows);
    } catch (err) {
      console.error('Error executing query', err);
      res.status(500).send('Error retrieving charters');
    }
  });

// Update a charter
app.patch('/charters/:id/edit', async (req, res) => {
  const { id } = req.params;
  const {
    start_date,
    end_date,
    project_id,
    description,
    kpis,
    risks,
    mitigation_strategies,
    target_participants,
    submitter_name
  } = req.body;

  try {
    let setClause = ''; // Initialize an empty string for SET clause
    const values = [];
    let valueIndex = 1; // Initialize value index for parameterized query

    // Check each field and append to SET clause if present
    if (start_date !== undefined && start_date !== '') {
      setClause += `start_date = $${valueIndex}, `;
      values.push(start_date);
      valueIndex++;
    }
    if (end_date !== undefined && end_date !== '') {
      setClause += `end_date = $${valueIndex}, `;
      values.push(end_date);
      valueIndex++;
    }
    if (project_id !== undefined && project_id !== '') {
      setClause += `project_id = $${valueIndex}, `;
      values.push(project_id);
      valueIndex++;
    }
    if (description !== undefined && description !== '') {
      setClause += `description = $${valueIndex}, `;
      values.push(description);
      valueIndex++;
    }
    if (kpis !== undefined && kpis !== '') {
      setClause += `kpis = $${valueIndex}, `;
      values.push(kpis);
      valueIndex++;
    }
    if (risks !== undefined && risks !== '') {
      setClause += `risks = $${valueIndex}, `;
      values.push(risks);
      valueIndex++;
    }
    if (mitigation_strategies !== undefined && mitigation_strategies !== '') {
      setClause += `mitigation_strategies = $${valueIndex}, `;
      values.push(mitigation_strategies);
      valueIndex++;
    }
    if (target_participants !== undefined && target_participants !== '') {
      setClause += `target_participants = $${valueIndex}, `;
      values.push(target_participants);
      valueIndex++;
    }
    if (submitter_name !== undefined && submitter_name !== '') {
      setClause += `submitter_name = $${valueIndex}, `;
      values.push(submitter_name);
      valueIndex++;
    }

    // Remove the trailing comma and space from the SET clause
    setClause = setClause.slice(0, -2);

    // Construct the UPDATE query dynamically
    if (setClause) {
      const query = `UPDATE charter SET ${setClause} WHERE project_id = $${valueIndex}`;
      values.push(id);

      // Execute the query
      const result = await db.query(query, values);
      res.json(result.rows[0]);
    } else {
      res.status(400).send('No valid fields to update');
    }
  } catch (err) {
    console.error('Error executing query', err);
    res.status(500).send('Error updating charter');
  }
});


  
  // Delete a charter
  app.delete('/charters/:id/delete', async (req, res) => {
    const { id } = req.params;
    const query = 'DELETE FROM charter WHERE id = $1';
    const values = [id];
    try {
      await db.query(query, values);
      res.send('Charter deleted successfully');
    } catch (err) {
      console.error('Error executing query', err);
      res.status(500).send('Error deleting charter');
    }
  });

//---------------------------------------- Pending Projects ------------------------------------------------

// Create a new pending project
app.post('/pendingprojects/add', async (req, res) => {
  const { project_name, submitter_name } = req.body;
  const query = 'INSERT INTO pending_projects (project_name, stutas, submitter_name) VALUES ($1, $2, $3)';
  const values = [project_name, 'Pending', submitter_name];
  try {
      const result = await db.query(query, values);
      res.json(result.rows[0]);
  } catch (err) {
      console.error('Error executing query', err);
      res.status(500).send('Error creating pending project');
  }
});

// Get all pending projects
app.get('/pendingprojects', async (req, res) => {
  try {
      const result = await db.query('SELECT * FROM pending_projects');
      res.json(result.rows);
  } catch (err) {
      console.error('Error executing query', err);
      res.status(500).send('Error retrieving pending projects');
  }
});

// Update a pending project
app.patch('/pendingprojects/:id/edit', async (req, res) => {
  const { id } = req.params;
  const { project_name } = req.body;
  const query = 'UPDATE pending_projects SET project_name = $1 WHERE id = $2 RETURNING *';
  const values = [project_name, id];
  try {
      const result = await db.query(query, values);
      res.json(result.rows[0]);
  } catch (err) {
      console.error('Error executing query', err);
      res.status(500).send('Error updating pending project');
  }
});

// Delete a pending project
app.delete('/pendingprojects/:id/delete', async (req, res) => {
  const { id } = req.params;
  const query = 'DELETE FROM pending_projects WHERE id = $1';
  const values = [id];
  try {
      await db.query(query, values);
      res.send('Pending project deleted successfully');
  } catch (err) {
      console.error('Error executing query', err);
      res.status(500).send('Error deleting pending project');
  }
});

//---------------------------------------- Active Projects ------------------------------------------------

// Create a new active project
app.post('/activeprojects/add', async (req, res) => {
  const { project_name, submitter_name } = req.body;
  const query = 'INSERT INTO active_projects (project_name, stutas, submitter_name) VALUES ($1, $2, $3) RETURNING *';
  const values = [project_name, 'Active', submitter_name];
  try {
      const result = await db.query(query, values);
      res.json(result.rows[0]);
  } catch (err) {
      console.error('Error executing query', err);
      res.status(500).send('Error creating active project');
  }
});

// Get all active projects
app.get('/activeprojects', async (req, res) => {
  try {
      const result = await db.query('SELECT * FROM active_projects');
      res.json(result.rows);
  } catch (err) {
      console.error('Error executing query', err);
      res.status(500).send('Error retrieving active projects');
  }
});

// Update an active project
app.patch('/activeprojects/:id/edit', async (req, res) => {
  const { id } = req.params;
  const { project_name } = req.body;
  const query = 'UPDATE active_projects SET project_name = $1 WHERE id = $2 RETURNING *';
  const values = [project_name, id];
  try {
      const result = await db.query(query, values);
      res.json(result.rows[0]);
  } catch (err) {
      console.error('Error executing query', err);
      res.status(500).send('Error updating active project');
  }
});

// Delete an active project
app.delete('/activeprojects/:id/delete', async (req, res) => {
  const { id } = req.params;
  const query = 'DELETE FROM active_projects WHERE id = $1';
  const values = [id];
  try {
      await db.query(query, values);
      res.send('Active project deleted successfully');
  } catch (err) {
      console.error('Error executing query', err);
      res.status(500).send('Error deleting active project');
  }
});

// --------------------------------------- ACTIVITY FORM ---------------------------------------------------
// Create a new activity form
app.post('/activity_forms/add', async (req, res) => {
    const { start_date, end_date, project_id, description, kpis, risks, target_participants, mitigation_strategies, submitter_name } = req.body;
    const query = 'INSERT INTO activity_form (start_date, end_date, project_id, description, kpis, risks, target_participants, mitigation_strategies, submitter_name) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)';
    const values = [start_date, end_date, project_id, description, kpis, risks, target_participants, mitigation_strategies, submitter_name];
    try {
      const result = await db.query(query, values);
      res.json(result.rows[0]);
    } catch (err) {
      console.error('Error executing query', err);
      res.status(500).send('Error creating activity form');
    }
  });
  
  // Get all activity forms
  app.get('/activity_forms', async (req, res) => {
    try {
      const result = await db.query('SELECT * FROM activity_form');
      res.json(result.rows);
    } catch (err) {
      console.error('Error executing query', err);
      res.status(500).send('Error retrieving activity forms');
    }
  });
  
  // Update an activity form
  app.patch('/activity_forms/:id/edit', async (req, res) => {
    const { id } = req.params;
  const {
    start_date,
    end_date,
    project_id,
    description,
    kpis,
    risks,
    mitigation_strategies,
    target_participants,
    submitter_name
  } = req.body;

  try {
    let setClause = ''; // Initialize an empty string for SET clause
    const values = [];
    let valueIndex = 1; // Initialize value index for parameterized query

    // Check each field and append to SET clause if present
    if (start_date !== undefined && start_date !== '') {
      setClause += `start_date = $${valueIndex}, `;
      values.push(start_date);
      valueIndex++;
    }
    if (submitter_name !== undefined && submitter_name !== '') {
      setClause += `submitter_name = $${valueIndex}, `;
      values.push(submitter_name);
      valueIndex++;
    }
    if (end_date !== undefined && end_date !== '') {
      setClause += `end_date = $${valueIndex}, `;
      values.push(end_date);
      valueIndex++;
    }
    if (project_id !== undefined && project_id !== '') {
      setClause += `project_id = $${valueIndex}, `;
      values.push(project_id);
      valueIndex++;
    }
    if (description !== undefined && description !== '') {
      setClause += `description = $${valueIndex}, `;
      values.push(description);
      valueIndex++;
    }
    if (kpis !== undefined && kpis !== '') {
      setClause += `kpis = $${valueIndex}, `;
      values.push(kpis);
      valueIndex++;
    }
    if (risks !== undefined && risks !== '') {
      setClause += `risks = $${valueIndex}, `;
      values.push(risks);
      valueIndex++;
    }
    if (mitigation_strategies !== undefined && mitigation_strategies !== '') {
      setClause += `mitigation_strategies = $${valueIndex}, `;
      values.push(mitigation_strategies);
      valueIndex++;
    }
    if (target_participants !== undefined && target_participants !== '') {
      setClause += `target_participants = $${valueIndex}, `;
      values.push(target_participants);
      valueIndex++;
    }
    if (submitter_name !== undefined && submitter_name !== '') {
      setClause += `submitter_name = $${valueIndex}, `;
      values.push(submitter_name);
      valueIndex++;
    }

    // Remove the trailing comma and space from the SET clause
    setClause = setClause.slice(0, -2);

    // Construct the UPDATE query dynamically
    if (setClause) {
      const query = `UPDATE activity_form SET ${setClause} WHERE project_id = $${valueIndex}`;
      values.push(id);

      // Execute the query
      const result = await db.query(query, values);
      res.json(result.rows[0]);
    } else {
      res.status(400).send('No valid fields to update');
    }
  } catch (err) {
    console.error('Error executing query', err);
    res.status(500).send('Error updating charter');
  }
});
  
  // Delete an activity form
  app.delete('/activity_forms/:id/delete', async (req, res) => {
    const { id } = req.params;
    const query = 'DELETE FROM activity_form WHERE id = $1';
    const values = [id];
    try {
      await db.query(query, values);
      res.send('Activity form deleted successfully');
    } catch (err) {
      console.error('Error executing query', err);
      res.status(500).send('Error deleting activity form');
    }
  });
  
// --------------------------------------- ACTIVITY CLOSURE ---------------------------------------------------
// Create a new activity closure
app.post('/activity_closures/add', async (req, res) => {
    const { start_date, end_date, project_id, description, kpis, risks, mitigation_strategies, total_male_participants, total_female_participants, submitter_name } = req.body;
    const query = 'INSERT INTO activity_closure (start_date, end_date, project_id, description, kpis, risks, mitigation_strategies, total_male_participants, total_female_participants, submitter_name) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)';
    const values = [start_date, end_date, project_id, description, kpis, risks, mitigation_strategies, total_male_participants, total_female_participants, submitter_name];
    try {
      const result = await db.query(query, values);
      res.json(result.rows[0]);
    } catch (err) {
      console.error('Error executing query', err);
      res.status(500).send('Error creating activity closure');
    }
  });
  
  // Get all activity closures
  app.get('/activity_closures', async (req, res) => {
    try {
      const result = await db.query('SELECT * FROM activity_closure');
      res.json(result.rows);
    } catch (err) {
      console.error('Error executing query', err);
      res.status(500).send('Error retrieving activity closures');
    }
  });
  
  // Update an activity closure
  app.put('/activity_closures/:id/edit', async (req, res) => {
    const { id } = req.params;
  const {
    project_id,
    start_date,
    end_date,
    description,
    submitter_name,
    kpis,
    risks,
    mitigation_strategies,
    total_male_participants,
    total_female_participants
  } = req.body;

  try {
    let setClause = ''; // Initialize an empty string for SET clause
    const values = [];
    let valueIndex = 1; // Initialize value index for parameterized query

    // Check each field and append to SET clause if present
    if (project_id !== undefined && project_id !== '') {
      setClause += `project_id = $${valueIndex}, `;
      values.push(project_id);
      valueIndex++;
    }
    if (submitter_name !== undefined && submitter_name !== '') {
      setClause += `submitter_name = $${valueIndex}, `;
      values.push(submitter_name);
      valueIndex++;
    }
    if (start_date !== undefined && start_date !== '') {
      setClause += `start_date = $${valueIndex}, `;
      values.push(start_date);
      valueIndex++;
    }
    if (end_date !== undefined && end_date !== '') {
      setClause += `end_date = $${valueIndex}, `;
      values.push(end_date);
      valueIndex++;
    }
    if (description !== undefined && description !== '') {
      setClause += `description = $${valueIndex}, `;
      values.push(description);
      valueIndex++;
    }
    if (kpis !== undefined && kpis !== '') {
      setClause += `kpis = $${valueIndex}, `;
      values.push(kpis);
      valueIndex++;
    }
    if (risks !== undefined && risks !== '') {
      setClause += `risks = $${valueIndex}, `;
      values.push(risks);
      valueIndex++;
    }
    if (mitigation_strategies !== undefined && mitigation_strategies !== '') {
      setClause += `mitigation_strategies = $${valueIndex}, `;
      values.push(mitigation_strategies);
      valueIndex++;
    }
    if (total_male_participants !== undefined && total_male_participants !== '') {
      setClause += `total_male_participants = $${valueIndex}, `;
      values.push(total_male_participants);
      valueIndex++;
    }
    if (total_female_participants !== undefined && total_female_participants !== '') {
      setClause += `total_female_participants = $${valueIndex}, `;
      values.push(total_female_participants);
      valueIndex++;
    }

    // Remove the trailing comma and space from the SET clause
    setClause = setClause.slice(0, -2);

    // Construct the UPDATE query dynamically
    if (setClause) {
      const query = `UPDATE activity_closure SET ${setClause} WHERE project_id = $${valueIndex} RETURNING *`;
      values.push(id);

      // Execute the query
      const result = await db.query(query, values);
      res.json(result.rows[0]);
    } else {
      res.status(400).send('No valid fields to update');
    }
  } catch (err) {
    console.error('Error executing query', err);
    res.status(500).send('Error updating activity closure');
  }
  });
  
  // Delete an activity closure
  app.delete('/activity_closures/:id/delete', async (req, res) => {
    const { id } = req.params;
    const query = 'DELETE FROM activity_closure WHERE id = $1';
    const values = [id];
    try {
      await db.query(query, values);
      res.send('Activity closure deleted successfully');
    } catch (err) {
      console.error('Error executing query', err);
      res.status(500).send('Error deleting activity closure');
    }
  });
  
// --------------------------------------- PROJECT CLOSURE ---------------------------------------------------
// Create a new project closure
app.post('/project_closures/add', async (req, res) => {
    const { project_id, start_date, end_date, project_feedback, lessons_learned, kpis, risks, mitigation_strategies, total_male_participants, total_female_participants, submitter_name } = req.body;
    const query = 'INSERT INTO project_closure (project_id, start_date, end_date, project_feedback, lessons_learned, kpis, risks, mitigation_strategies, total_male_participants, total_female_participants, submitter_name) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)';
    const values = [project_id, start_date, end_date, project_feedback, lessons_learned, kpis, risks, mitigation_strategies, total_male_participants, total_female_participants, submitter_name];
    try {
      const result = await db.query(query, values);
      res.json(result.rows[0]);
    } catch (err) {
      console.error('Error executing query', err);
      res.status(500).send('Error creating project closure');
    }
  });
  
  // Get all project closures
  app.get('/project_closures', async (req, res) => {
    try {
      const result = await db.query('SELECT * FROM project_closure');
      res.json(result.rows);
    } catch (err) {
      console.error('Error executing query', err);
      res.status(500).send('Error retrieving project closures');
    }
  });
  

  // Update a project closure
app.patch('/project_closures/:id/edit', async (req, res) => {
  const { id } = req.params;
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

  try {
    let setClause = ''; // Initialize an empty string for SET clause
    const values = [];
    let valueIndex = 1; // Initialize value index for parameterized query

    // Check each field and append to SET clause if present
    if (project_id !== undefined && project_id !== '') {
      setClause += `project_id = $${valueIndex}, `;
      values.push(project_id);
      valueIndex++;
    }
    if (start_date !== undefined && start_date !== '') {
      setClause += `start_date = $${valueIndex}, `;
      values.push(start_date);
      valueIndex++;
    }
    if (end_date !== undefined && end_date !== '') {
      setClause += `end_date = $${valueIndex}, `;
      values.push(end_date);
      valueIndex++;
    }
    if (project_feedback !== undefined && project_feedback !== '') {
      setClause += `project_feedback = $${valueIndex}, `;
      values.push(project_feedback);
      valueIndex++;
    }
    if (lessons_learned !== undefined && lessons_learned !== '') {
      setClause += `lessons_learned = $${valueIndex}, `;
      values.push(lessons_learned);
      valueIndex++;
    }
    if (submitter_name !== undefined && submitter_name !== '') {
      setClause += `submitter_name = $${valueIndex}, `;
      values.push(submitter_name);
      valueIndex++;
    }
    if (kpis !== undefined && kpis !== '') {
      setClause += `kpis = $${valueIndex}, `;
      values.push(kpis);
      valueIndex++;
    }
    if (risks !== undefined && risks !== '') {
      setClause += `risks = $${valueIndex}, `;
      values.push(risks);
      valueIndex++;
    }
    if (mitigation_strategies !== undefined && mitigation_strategies !== '') {
      setClause += `mitigation_strategies = $${valueIndex}, `;
      values.push(mitigation_strategies);
      valueIndex++;
    }
    if (total_male_participants !== undefined && total_male_participants !== '') {
      setClause += `total_male_participants = $${valueIndex}, `;
      values.push(total_male_participants);
      valueIndex++;
    }
    if (total_female_participants !== undefined && total_female_participants !== '') {
      setClause += `total_female_participants = $${valueIndex}, `;
      values.push(total_female_participants);
      valueIndex++;
    }

    // Remove the trailing comma and space from the SET clause
    setClause = setClause.slice(0, -2);

    // Construct the UPDATE query dynamically
    if (setClause) {
      const query = `UPDATE project_closure SET ${setClause} WHERE project_id = $${valueIndex} RETURNING *`;
      values.push(id);

      // Execute the query
      const result = await db.query(query, values);
      res.json(result.rows[0]);
    } else {
      res.status(400).send('No valid fields to update');
    }
  } catch (err) {
    console.error('Error executing query', err);
    res.status(500).send('Error updating project closure');
  }
});

  
  // Delete a project closure
  app.delete('/project_closures/:id/delete', async (req, res) => {
    const { id } = req.params;
    const query = 'DELETE FROM project_closure WHERE id = $1';
    const values = [id];
    try {
      await db.query(query, values);
      res.send('Project closure deleted successfully');
    } catch (err) {
      console.error('Error executing query', err);
      res.status(500).send('Error deleting project closure');
    }
  });
  

// ----------------------------------------------- VIEWS -------------------------------------------------------------------

  // Get project summary
    app.get('/project_summary/view', async (req, res) => {
      try {
        const result = await db.query('SELECT * FROM project_summary');
        res.json(result.rows);
      } catch (err) {
        console.error('Error executing query', err);
        res.status(500).send('Error retrieving activity forms');
      }
    });

  // Get all users
    app.get('/users/view', async (req, res) => {
      try {
        const result = await db.query('SELECT * FROM user_project_view');
        res.json(result.rows);
      } catch (err) {
        console.error('Error executing query', err);
        res.status(500).send('Error retrieving users');
      }
    });
    
      // Get all projects
      app.get('/projectmanagement/view', async (req, res) => {
        try {
          const result = await db.query('SELECT * FROM projectmanagementView');
          res.json(result.rows);
        } catch (err) {
          console.error('Error executing query', err);
          res.status(500).send('Error retrieving users');
        }
      });

      // Get all users
      app.get('/status/view', async (req, res) => {
        try {
          const result = await db.query('SELECT * FROM project_submission_info');
          res.json(result.rows);
        } catch (err) {
          console.error('Error executing query', err);
          res.status(500).send('Error retrieving users');
        }
      });

    
app.listen(port, () => {
    console.log(`Backend Running on http://localhost:${port}`)
})

