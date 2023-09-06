const conventionalRecommendedBump = require(`conventional-recommended-bump`);
var npmBump = require('npm-bump');


conventionalRecommendedBump({
  preset: `angular`
}, (error, recommendation) => {
  console.log(recommendation.releaseType); // 'major'
  npmBump(recommendation.releaseType).then(() => {
    console.log(`done`)
  });
});



