import React from 'react';

const About = () => {
  return (
  <div className="content-card">
    <div className="about-header">
      <h2 className="section-title" style={{ color: 'white' }}>About SDOLC Tracking System</h2>
      <p>Learn about our mission, vision, and the purpose of our document tracking system</p>
    </div>
    <div className="about-content">
      <div className="about-grid">
        <div className="about-card mission">
          <h3><i className="fas fa-bullseye"></i> Our Mission</h3>
          <p>To protect and promote the right of every Filipino to quality, equitable, culture-based, and complete basic education where: Students learn in a child-friendly, gender-sensitive, safe, and motivating environment. Teachers facilitate learning and constantly nurture every learner.</p>
        </div>
        <div className="about-card vision">
          <h3><i className="fas fa-eye"></i> Our Vision</h3>
          <p>We dream of Filipinos who passionately love their country and whose values and competencies enable them to realize their full potential and contribute meaningfully to building the nation.</p>
          <p>As a learner-centered public institution, the Department of Education continuously improves itself to better serve its stakeholders.</p>
        </div>
      </div>
      <div className="quality-policy-section">
        <div className="quality-policy-card">
          <h3 className="quality-policy-title">
            <i className="fas fa-check-circle"></i>
            Quality Policy Statement
          </h3>
          <div className="quality-policy-intro">
            <span>The Department of Education is committed to provide learners with quality basic education that is accessible, inclusive, and liberating through:</span>
          </div>
          <div className="quality-policy-grid">
            <div className="policy-item">
              <i className="fas fa-hand-point-right"></i>
              <span>Proactive leadership</span>
            </div>
            <div className="policy-item">
              <i className="fas fa-users"></i>
              <span>Shared governance</span>
            </div>
            <div className="policy-item">
              <i className="fas fa-file-alt"></i>
              <span>Evidenced-based policies, standards and programs</span>
            </div>
            <div className="policy-item">
              <i className="fas fa-book"></i>
              <span>Responsive and relevant curricula</span>
            </div>
            <div className="policy-item">
              <i className="fas fa-users-cog"></i>
              <span>Highly competent and committed officials, teaching personnel</span>
            </div>
            <div className="policy-item">
              <i className="fas fa-school"></i>
              <span>An enabling learning environment</span>
            </div>
          </div>
          <div className="quality-policy-conclusion">
            <span>The Department upholds the highest standards of conduct and performance to fulfill stakeholders’ needs and expectations by adhering to constitutional mandates, statutory, and regulatory requirements.</span>
          </div>
        </div>
      </div>
      <div className="values-section">
        <h3><i className="fas fa-heart"></i> Our Core Values</h3>
        <div className="values-grid">
          <div className="value-card">
            <div className="value-icon">
              <i className="fas fa-pray"></i>
            </div>
            <h4>Maka-Diyos</h4>
            <p>God-loving and service to Almighty God</p>
          </div>
          <div className="value-card">
            <div className="value-icon">
              <i className="fas fa-users"></i>
            </div>
            <h4>Maka-tao</h4>
            <p>People-centered and humane</p>
          </div>
          <div className="value-card">
            <div className="value-icon">
              <i className="fas fa-leaf"></i>
            </div>
            <h4>Makakalikasan</h4>
            <p>Environment-friendly and protective of nature</p>
          </div>
          <div className="value-card">
            <div className="value-icon">
              <i className="fas fa-flag"></i>
            </div>
            <h4>Makabansa</h4>
            <p>Patriotic and nationalistic</p>
          </div>
        </div>
      </div>
      <div className="mandate-section">
        <h3><i className="fas fa-gavel"></i> Our Mandate</h3>
        <p>The Department of Education was established through the Education Decree of 1873 as the Superior Commission of Primary Instruction under a Chairman.</p>
        <div className="about-divider"></div>
        <p>The present-day Department of Education was eventually mandated through Republic Act 9155, otherwise known as the Governance of Basic Education Act of 2001.</p>
        <p>The Department of Education (DepEd) formulates, implements, and manages projects in the areas of formal and non-formal basic education.</p>
      </div>
      <div className="system-info">
        <h3><i className="fas fa-file-circle-check"></i> About SDOLC Tracking System</h3>
        <p>The SDOLC Tracking System is an ongoing project being developed to support and facilitate the efficient movement of documents in the Schools Division of Laoag City.</p>
        <div className="about-divider"></div>
        <p>It is used to automate searching and track the whereabouts of documents as they are routed to different Schools Division Office units, public schools, or other offices.</p>
        <div className="about-divider"></div>
        <p>Our system provides real-time tracking, secure document handling, and comprehensive audit trails to ensure transparency and efficiency in document management throughout the division.</p>
      </div>
      <div className="about-team">
        <div className="team-members">
          <div className="team-member">
            <div className="member-avatar">
              <i className="fas fa-laptop-code"></i>
            </div>
            <h4>Lead Developer</h4>
            <p><a href="https://www.facebook.com/yaboigerard" target="_blank" rel="noopener noreferrer">Rav Naceno</a></p>
          </div>
          <div className="team-member">
            <div className="member-avatar">
              <i className="fas fa-paint-brush"></i>
            </div>
            <h4>UI/UX Designer</h4>
            <p><a href="https://www.facebook.com/jexzxlovshapw" target="_blank" rel="noopener noreferrer">Jeth-Jeth Gaor</a></p>
          </div>
        </div>        </div>
      </div>
    </div>
  );
};

export default About;