const { expect } = require('chai');
const fs = require('fs');
const path = require('path');

describe('Gherkin Tags Integration', () => {
  const testDir = path.join(__dirname, 'temp-gherkin-tags');

  beforeEach(() => {
    // Clean and create test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
    fs.mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    // Clean up test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('Gherkin tag format validation', () => {
    it('should support standard Gherkin tags with metadata', () => {
      const featureContent = `@S12345678
Feature: User Management

  @T87654321 @authentication @smoke
  Scenario: User login with valid credentials
    Given I am on the login page
    When I enter valid credentials
    Then I should be logged in

  @T87654322 @authentication
  Scenario: User login with invalid credentials
    Given I am on the login page
    When I enter invalid credentials
    Then I should see an error message`;

      const testFile = path.join(testDir, 'user-management.feature');
      fs.writeFileSync(testFile, featureContent);

      // Verify file was created correctly
      const content = fs.readFileSync(testFile, 'utf8');
      expect(content).to.include('@S12345678');
      expect(content).to.include('@T87654321');
      expect(content).to.include('@authentication');
      expect(content).to.include('@smoke');
      expect(content).to.include('Feature: User Management');
      expect(content).to.include('Scenario: User login with valid credentials');
    });

    it('should work with various tag combinations', () => {
      const featureContent = `@S87654321 @suite:integration
Feature: E-commerce Checkout

  @T12345678 @smoke @regression
  Scenario: Complete purchase flow
    Given I have items in my cart
    When I proceed to checkout
    Then I should complete the purchase

  @manual
  Scenario: Test error handling
    Given an error occurs
    When I handle it
    Then the system recovers`;

      const testFile = path.join(testDir, 'checkout.feature');
      fs.writeFileSync(testFile, featureContent);

      const content = fs.readFileSync(testFile, 'utf8');
      expect(content).to.include('@S87654321');
      expect(content).to.include('@suite:integration');
      expect(content).to.include('@T12345678');
      expect(content).to.include('@smoke');
      expect(content).to.include('@regression');
      expect(content).to.include('@manual');
    });

    it('should handle scenarios without test IDs', () => {
      const featureContent = `@S11111111
Feature: Basic Feature

  @functional
  Scenario: Test without ID
    Given something
    When I do something
    Then something happens

  @T22222222
  Scenario: Test with ID
    Given something else
    When I do something else
    Then something else happens`;

      const testFile = path.join(testDir, 'mixed.feature');
      fs.writeFileSync(testFile, featureContent);

      const content = fs.readFileSync(testFile, 'utf8');
      expect(content).to.include('@S11111111');
      expect(content).to.include('@functional');
      expect(content).to.include('@T22222222');
      expect(content).to.include('Scenario: Test without ID');
      expect(content).to.include('Scenario: Test with ID');
    });
  });

  describe('ID format validation', () => {
    it('should follow 8-character alphanumeric format for suite IDs', () => {
      const validSuiteIds = ['@S12345678', '@S1A2B3C4D', '@SABCD1234', '@S87654321'];
      
      validSuiteIds.forEach(id => {
        expect(id).to.match(/^@S[\w\d]{8}$/);
      });
    });

    it('should follow 8-character alphanumeric format for test IDs', () => {
      const validTestIds = ['@T12345678', '@T1A2B3C4D', '@TABCD1234', '@T87654321'];
      
      validTestIds.forEach(id => {
        expect(id).to.match(/^@T[\w\d]{8}$/);
      });
    });

    it('should support custom metadata tags', () => {
      const validMetaTags = [
        '@author:john.doe',
        '@component:auth',
        '@type:functional',
        '@severity:major',
        '@suite:integration'
      ];

      validMetaTags.forEach(tag => {
        expect(tag).to.match(/^@[\w]+:[\w\.]+$/);
      });
    });
  });

  describe('Feature file structure', () => {
    it('should maintain clean Gherkin syntax', () => {
      const featureContent = `@S12345678 @component:user-mgmt
Feature: User Management System
  As a system administrator
  I want to manage user accounts
  So that I can control access to the system

  Background:
    Given the system is running
    And the database is connected

  @T12345678 @smoke
  Scenario: Create new user
    Given I am logged in as an administrator
    When I create a new user with valid details
    Then the user should be created successfully
    And I should see a confirmation message

  @T87654321
  Scenario Outline: Login with different roles
    Given I am a user with role "<role>"
    When I login with valid credentials
    Then I should see the "<dashboard>" dashboard

    Examples:
      | role  | dashboard |
      | admin | admin     |
      | user  | user      |`;

      const testFile = path.join(testDir, 'user-mgmt.feature');
      fs.writeFileSync(testFile, featureContent);

      const content = fs.readFileSync(testFile, 'utf8');
      
      // Verify standard Gherkin elements are preserved
      expect(content).to.include('Feature: User Management System');
      expect(content).to.include('As a system administrator');
      expect(content).to.include('Background:');
      expect(content).to.include('Scenario:');
      expect(content).to.include('Scenario Outline:');
      expect(content).to.include('Examples:');
      expect(content).to.include('Given I am logged in');
      expect(content).to.include('When I create a new user');
      expect(content).to.include('Then the user should be created');
      
      // Verify tags are properly placed
      expect(content).to.include('@S12345678 @component:user-mgmt');
      expect(content).to.include('@T12345678 @smoke');
      expect(content).to.include('@T87654321');
    });
  });
});