const { expect } = require('chai');
const fs = require('fs');
const path = require('path');
const { cleanFiles } = require('../util');
const analyse = require('../analyzer');

describe('Purge Empty Lines', () => {
  const testDir = path.join(__dirname, 'temp_purge_test');
  
  beforeEach(() => {
    // Clean up test directory
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

  it('should not leave empty lines before Feature after purge', async () => {
    const testFile = path.join(testDir, 'test.feature');
    const featureContent = `@S12345678
Feature: Test Feature
  
  @T12345678
  Scenario: Test Scenario
    Given I have a test
    When I run it
    Then it should pass
    
  @T87654321  
  Scenario Outline: Test Outline
    Given I have <value>
    When I process it
    Then I get <result>
    
    Examples:
      | value | result |
      | 1     | pass   |`;
      
    fs.writeFileSync(testFile, featureContent);
    
    // Analyze and clean with purge (dangerous = true)
    const features = await analyse('**/*.feature', testDir);
    cleanFiles(features, {}, testDir, true); // dangerous = true (purge mode)
    
    const cleanedContent = fs.readFileSync(testFile, 'utf8');
    
    // Should not have empty lines before Feature
    expect(cleanedContent).to.not.match(/^\s*\n\s*Feature:/);
    expect(cleanedContent).to.match(/^Feature:/);
    
    // Should not have excessive empty lines (more than 2 consecutive)
    expect(cleanedContent).to.not.match(/\n\s*\n\s*\n\s*\n/);
    
    console.log('Cleaned content:');
    console.log(cleanedContent);
  });

  it('should not leave empty lines before Feature after safe clean', async () => {
    const testFile = path.join(testDir, 'test.feature');
    const featureContent = `@S12345678
Feature: Test Feature
  
  @T12345678
  Scenario: Test Scenario
    Given I have a test
    When I run it
    Then it should pass
    
  @T87654321  
  Scenario Outline: Test Outline
    Given I have <value>
    When I process it
    Then I get <result>
    
    Examples:
      | value | result |
      | 1     | pass   |`;
      
    fs.writeFileSync(testFile, featureContent);
    
    // Analyze and clean with safe mode (dangerous = false)
    const features = await analyse('**/*.feature', testDir);
    const testomatioMap = {
      suites: { 'Test Feature': '@S12345678' },
      tests: { 'Test Scenario': '@T12345678', 'Test Outline': '@T87654321' }
    };
    cleanFiles(features, testomatioMap, testDir, false); // dangerous = false (safe mode)
    
    const cleanedContent = fs.readFileSync(testFile, 'utf8');
    
    // Should not have empty lines before Feature
    expect(cleanedContent).to.not.match(/^\s*\n\s*Feature:/);
    expect(cleanedContent).to.match(/^Feature:/);
    
    // Should not have excessive empty lines (more than 2 consecutive)
    expect(cleanedContent).to.not.match(/\n\s*\n\s*\n\s*\n/);
    
    console.log('Cleaned content (safe mode):');
    console.log(cleanedContent);
  });

  it('should handle multiple consecutive empty lines properly', async () => {
    const testFile = path.join(testDir, 'test.feature');
    const featureContent = `@S12345678


Feature: Test Feature


  @T12345678


  Scenario: Test Scenario
    Given I have a test


  @T87654321


  Scenario: Another Scenario  
    Given I have another test`;
      
    fs.writeFileSync(testFile, featureContent);
    
    // Analyze and clean with purge
    const features = await analyse('**/*.feature', testDir);
    cleanFiles(features, {}, testDir, true);
    
    const cleanedContent = fs.readFileSync(testFile, 'utf8');
    
    // Should start directly with Feature
    expect(cleanedContent).to.match(/^Feature:/);
    
    // Should not have multiple empty lines between scenarios
    expect(cleanedContent).to.not.match(/\n\n\n/);
    
    console.log('Cleaned content (multiple empty lines):');
    console.log(cleanedContent);
  });

  it('should handle complex edge cases with mixed indentation and tags', async () => {
    const testFile = path.join(testDir, 'complex.feature');
    const featureContent = `

@S12345678

@tag1 @tag2
Feature: Complex Feature with mixed formatting


  Background:
    Given I have some background


  @T12345678

  @important
  Scenario: Indented scenario with tags
    Given I have a step
    When I do something

  
  @T87654321
  @critical @smoke

  Scenario Outline: Another scenario with multiple tags  
    Given I have <param>
    Then I expect <result>

    Examples:
      | param | result |
      | A     | 1      |


  @T11111111
  Scenario: Final scenario
    Given I have final step`;
      
    fs.writeFileSync(testFile, featureContent);
    
    // Analyze and clean with purge
    const features = await analyse('**/*.feature', testDir);
    cleanFiles(features, {}, testDir, true);
    
    const cleanedContent = fs.readFileSync(testFile, 'utf8');
    
    // Should start directly with Feature (no leading empty lines)
    expect(cleanedContent).to.match(/^@tag1 @tag2\nFeature:/);
    
    // Should not have excessive empty lines (more than 2 consecutive)
    expect(cleanedContent).to.not.match(/\n\s*\n\s*\n\s*\n/);
    
    // Should preserve proper formatting for Examples
    expect(cleanedContent).to.include('Examples:');
    expect(cleanedContent).to.include('| param | result |');
    
    console.log('Complex cleaned content:');
    console.log(cleanedContent);
  });
});