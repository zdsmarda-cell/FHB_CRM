import fs from 'fs';

let content = fs.readFileSync('server.ts', 'utf8');

const jobsCode = `
async function sendAssignmentEmail(hunterId: string, dealId: string, companyName: string, connection: any) {
  try {
    const [hunterRows] = await connection.query("SELECT email, managerId FROM users WHERE id = ?", [hunterId]);
    if (!hunterRows || (hunterRows as any[]).length === 0) return;
    const hunter = (hunterRows as any[])[0];
    
    let managerEmail = null;
    if (hunter.managerId) {
      const [mgrRows] = await connection.query("SELECT email FROM users WHERE id = ?", [hunter.managerId]);
      if (mgrRows && (mgrRows as any[]).length > 0) managerEmail = (mgrRows as any[])[0].email;
    }
    
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.ethereal.email',
      port: parseInt(process.env.SMTP_PORT || '587'),
      auth: process.env.SMTP_USER ? {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      } : undefined
    });
    
    const appUrl = process.env.VITE_APP_URL || 'http://localhost:3000';
    const link = \`\${appUrl}/deal/\${dealId}\`;
    
    const mailOptions = {
      from: process.env.SMTP_FROM || '"CRM" <crm@mobilgroup.cz>',
      to: hunter.email,
      cc: managerEmail ? managerEmail : undefined,
      subject: 'Nová příležitost automaticky přidělena',
      text: \`Byla vám automaticky přidělena nová příležitost pro společnost \${companyName}.\\nOdkaz: \${link}\`
    };
    
    if (!process.env.SMTP_HOST) {
        console.log("[JOBS] Mock sending email to", hunter.email, "Subject:", mailOptions.subject);
    } else {
        await transporter.sendMail(mailOptions);
    }
  } catch (err) {
    console.error("[JOBS] Failed to send assignment email", err);
  }
}

async function runHourlyJob() {
  console.log("[JOBS] Running hourly job...");
  try {
    const connection = await pool.getConnection();
    try {
      // Find deals in opportunity with a hunter that have a relevant activity
      const [rows] = await connection.query(\`
        SELECT DISTINCT d.id 
        FROM deals d
        JOIN activities a ON d.id = a.dealId
        WHERE d.stage = 'opportunity' 
          AND d.hunterId IS NOT NULL 
          AND d.hunterId != ''
          AND a.type IN ('call', 'teams', 'meeting')
      \`);
      
      const dealsToAdvance = rows as {id: string}[];
      if (dealsToAdvance.length > 0) {
        for (const deal of dealsToAdvance) {
          await connection.query("UPDATE deals SET stage = 'lead', updatedAt = NOW() WHERE id = ?", [deal.id]);
          console.log(\`[JOBS] Deal \${deal.id} advanced to lead.\`);
        }
      }
    } finally {
      connection.release();
    }
  } catch (err) {
    console.error("[JOBS] Hourly job error:", err);
  }
}

async function runDailyJob() {
  console.log("[JOBS] Running daily job...");
  try {
    const connection = await pool.getConnection();
    try {
      // Find opportunity deals older than 5 days without a hunter
      const [dealRows] = await connection.query(\`
        SELECT d.id, c.name as companyName 
        FROM deals d
        JOIN companies c ON d.companyId = c.id
        WHERE d.stage = 'opportunity' 
          AND (d.hunterId IS NULL OR d.hunterId = '')
          AND d.createdAt < DATE_SUB(NOW(), INTERVAL 5 DAY)
      \`);
      
      const dealsToAssign = dealRows as {id: string, companyName: string}[];
      if (dealsToAssign.length > 0) {
        // Get valid hunters (role = 'hunter', not test account)
        const [hunterRows] = await connection.query(\`
          SELECT id 
          FROM users 
          WHERE role = 'hunter' 
            AND isActive = TRUE 
            AND (isTestAccount IS NULL OR isTestAccount = FALSE)
        \`);
        
        const hunters = hunterRows as {id: string}[];
        if (hunters.length > 0) {
          for (const deal of dealsToAssign) {
            // Find hunter with least leads+opportunities
            let bestHunterId = hunters[0].id;
            let minDeals = Infinity;
            const tieHunters = [];
            
            for (const h of hunters) {
               const [cntRows] = await connection.query(\`
                 SELECT COUNT(*) as count 
                 FROM deals 
                 WHERE hunterId = ? AND stage IN ('opportunity', 'lead')
               \`, [h.id]);
               const count = (cntRows as any[])[0].count;
               if (count < minDeals) {
                 minDeals = count;
                 tieHunters.length = 0;
                 tieHunters.push(h.id);
               } else if (count === minDeals) {
                 tieHunters.push(h.id);
               }
            }
            
            bestHunterId = tieHunters[Math.floor(Math.random() * tieHunters.length)];
            
            await connection.query("UPDATE deals SET hunterId = ?, updatedAt = NOW() WHERE id = ?", [bestHunterId, deal.id]);
            console.log(\`[JOBS] Auto-assigned deal \${deal.id} to hunter \${bestHunterId}\`);
            
            await sendAssignmentEmail(bestHunterId, deal.id, deal.companyName, connection);
          }
        } else {
          console.log("[JOBS] No valid hunters found for auto-assignment.");
        }
      }
    } finally {
      connection.release();
    }
  } catch (err) {
    console.error("[JOBS] Daily job error:", err);
  }
}

// Start jobs
setTimeout(() => {
  runHourlyJob();
  runDailyJob();
  setInterval(runHourlyJob, 60 * 60 * 1000); // 1 hour
  setInterval(runDailyJob, 24 * 60 * 60 * 1000); // 24 hours
}, 10000);

`;

if (!content.includes('runHourlyJob')) {
  content = content.replace("  // Setup Socket.IO", jobsCode + "\n  // Setup Socket.IO");
}

fs.writeFileSync('server.ts', content);
