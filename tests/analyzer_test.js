const { expect } = require('chai');
const path = require('path');
const analyse = require('../analyzer');

describe('Analyzer', () => {
  it('Should parse feature files', async () => {
    const features = await analyse('**/valid*.feature', path.join(__dirname, '..', 'example'));
    const featureTitles = features.map(featureData => featureData.feature);
    const scenarios = features.reduce((acc, feature) => {
      acc.push(...feature.scenario);
      return acc;
    }, []);

    expect(features.length).equal(2);
    expect(featureTitles).to.include('Google search');
    expect(featureTitles).to.include('Business rules');
    expect(scenarios.length).equal(7);
  });

  it('Should not include "And" or "But" in steps', async () => {
    const features = await analyse('**/*google.feature', path.join(__dirname, '..', 'example'));
    const scenarios = features.reduce((acc, feature) => {
      acc.push(...feature.scenario);
      return acc;
    }, []);

    const stepsMap = {};
    const steps = scenarios.reduce((acc, scenario) => {
      for (const step of scenario.steps) {
        acc.push(step.keyword);
        stepsMap[step.title] = step.keyword;
      }
      return acc;
    }, []);

    expect(steps).to.not.include('And');
    expect(steps).to.not.include('But');
    expect(stepsMap['This step keyword should not be taken']).equal('Then');
    expect(stepsMap['This should be replaced with Given']).equal('Given');
    expect(steps).to.include('Given');
    expect(steps).to.include('When');
    expect(steps).to.include('When');
  });

  it('Should have error messages for wrong formats', async () => {
    const features = await analyse('**/error_file.feature', path.join(__dirname, '..', 'example'));
    expect(features[0].error).not.equal(undefined);
  });

  it('Should parse empty', async () => {
    const features = await analyse('**/empty.feature', path.join(__dirname, '..', 'example'));
    expect(features[0].error).not.equal(undefined);
  });

  it('Should include scenarios from rules', async () => {
    const features = await analyse('**/rules.feature', path.join(__dirname, '..', 'example'));
    const scenarios = features.reduce((acc, feature) => {
      acc.push(...feature.scenario);
      return acc;
    }, []);
    const scenariosTitles = scenarios.map(scenarioData => scenarioData.name);

    expect(features.length).equal(1);
    expect(scenariosTitles).to.include('Scenario 1.1');
    expect(scenariosTitles).to.include('Scenario 1.2');
    expect(scenariosTitles).to.include('Scenario 1.3');
    expect(scenariosTitles).to.include('Scenario 2.1');
    expect(scenariosTitles).to.include('Scenario 2.2');
    expect(scenariosTitles).to.include('Scenario 2.3');
    expect(scenariosTitles).to.include('Scenario 3.1');
    expect(scenariosTitles).to.include('Scenario 3.2');
    expect(scenariosTitles).to.include('Scenario 3.3');
    expect(scenarios.length).equal(9);
  });

  it('Does not include the feature, rule and background description by default', async () => {
    const features = await analyse('**/rules.feature', path.join(__dirname, '..', 'example'), {
      includeFeatureCode: false,
      includeRuleCode: false,
      includeBackgroundCode: false,
    });
    const scenarios = features.reduce((acc, feature) => {
      acc.push(...feature.scenario);
      return acc;
    }, []);

    expect(features.length).equal(1);
    for (let scenario of scenarios) {
      const code = scenario.code.split('\n').map(line => line.trim());
      expect(code).to.not.include('Description of the feature');
      expect(code).to.not.include('Description of first rule');
      expect(code).to.not.include('Given all rules have something');
    }
    expect(scenarios.length).equal(9);
  });

  it('Can include the features description', async () => {
    const features = await analyse('**/rules.feature', path.join(__dirname, '..', 'example'), {
      includeFeatureCode: true,
      includeRuleCode: false,
      includeBackgroundCode: false,
    });
    const scenarios = features.reduce((acc, feature) => {
      acc.push(...feature.scenario);
      return acc;
    }, []);

    expect(features.length).equal(1);
    for (let scenario of scenarios) {
      const code = scenario.code.split('\n').map(line => line.trim());
      expect(code).to.include('Description of the feature');
    }
    expect(scenarios.length).equal(9);
  });

  it('Can include the parent rule description', async () => {
    const features = await analyse('**/rules.feature', path.join(__dirname, '..', 'example'), {
      includeFeatureCode: false,
      includeRuleCode: true,
      includeBackgroundCode: false,
    });
    const scenarios = features.reduce((acc, feature) => {
      acc.push(...feature.scenario);
      return acc;
    }, []);

    expect(features.length).equal(1);
    for (let scenario of scenarios.slice(0, 3)) {
      const code = scenario.code.split('\n').map(line => line.trim());
      expect(code).to.include('Description of first rule');
      expect(code).to.not.include('Description of second rule');
      expect(code).to.not.include('Description of third rule');
    }
    for (let scenario of scenarios.slice(3, 6)) {
      const code = scenario.code.split('\n').map(line => line.trim());
      expect(code).to.not.include('Description of first rule');
      expect(code).to.include('Description of second rule');
      expect(code).to.not.include('Description of third rule');
    }
    for (let scenario of scenarios.slice(6, 9)) {
      const code = scenario.code.split('\n').map(line => line.trim());
      expect(code).to.not.include('Description of first rule');
      expect(code).to.not.include('Description of second rule');
      expect(code).to.include('Description of third rule');
    }
    expect(scenarios.length).equal(9);
  });

  it('Can include background steps', async () => {
    const features = await analyse('**/rules.feature', path.join(__dirname, '..', 'example'), {
      includeFeatureCode: false,
      includeRuleCode: false,
      includeBackgroundCode: true,
    });
    const scenarios = features.reduce((acc, feature) => {
      acc.push(...feature.scenario);
      return acc;
    }, []);

    expect(features.length).equal(1);
    for (let scenario of scenarios) {
      const code = scenario.code.split('\n').map(line => line.trim());
      expect(code).to.include('Given all rules have something');
    }
    for (let scenario of scenarios.slice(0, 3)) {
      const code = scenario.code.split('\n').map(line => line.trim());
      expect(code).to.include('Given the first rule has something');
      expect(code).to.not.include('Given the second rule has something');
      expect(code).to.not.include('Given the third rule has something');
    }
    for (let scenario of scenarios.slice(3, 6)) {
      const code = scenario.code.split('\n').map(line => line.trim());
      expect(code).to.not.include('Given the first rule has something');
      expect(code).to.include('Given the second rule has something');
      expect(code).to.not.include('Given the third rule has something');
    }
    for (let scenario of scenarios.slice(6, 9)) {
      const code = scenario.code.split('\n').map(line => line.trim());
      expect(code).to.not.include('Given the first rule has something');
      expect(code).to.not.include('Given the second rule has something');
      expect(code).to.include('Given the third rule has something');
    }
    expect(scenarios.length).equal(9);
  });
});
