String cron_string = BRANCH_NAME == "master" ? "@daily" : ""

pipeline {
  agent any

  environment {
    GIT_PROJECT = "web-internal"
    JENKINS_WORKFLOW = "web-sharelatex-internal"
    TARGET_URL = "${env.JENKINS_URL}blue/organizations/jenkins/${JENKINS_WORKFLOW}/detail/$BRANCH_NAME/$BUILD_NUMBER/pipeline"
    GIT_API_URL = "https://api.github.com/repos/overleaf/${GIT_PROJECT}/statuses/$GIT_COMMIT"
  }

  triggers {
    cron(cron_string)
  }

  stages {
    stage('Pre') {
      steps {
        withCredentials([usernamePassword(credentialsId: 'GITHUB_INTEGRATION', usernameVariable: 'GH_AUTH_USERNAME', passwordVariable: 'GH_AUTH_PASSWORD')]) {
          sh "curl $GIT_API_URL \
            --data '{ \
            \"state\" : \"pending\", \
            \"target_url\": \"$TARGET_URL\", \
            \"description\": \"Your build is underway\", \
            \"context\": \"ci/jenkins\" }' \
            -u $GH_AUTH_USERNAME:$GH_AUTH_PASSWORD"
        }
      }
    }

    stage('Copy external pages') {
      steps {
        sh 'bin/copy_external_pages'
      }
    }

    stage('Delete node modules') {
      steps {
        sh 'rm -rf node_modules'
      }
    }

    stage('Build') {
      steps {
        sh 'DOCKER_COMPOSE_FLAGS="-f docker-compose.ci.yml" make build'
      }
    }

    stage('Parallel Tests') {

      parallel {

        stage('Module Acceptance Tests') {
          steps {
            sh 'DOCKER_COMPOSE_FLAGS="-f docker-compose.ci.yml" make test_acceptance_modules_run'
          }
        }

        stage('Frontend Tests') {
          steps {
            sh 'sleep 15'
            sh 'DOCKER_COMPOSE_FLAGS="-f docker-compose.ci.yml" make test_frontend_build_run'
          }
        }

        stage('Unit Tests') {
          steps {
            sh 'sleep 30'
            sh 'DOCKER_COMPOSE_FLAGS="-f docker-compose.ci.yml" make test_unit'
          }
        }

        stage('App Acceptance Tests') {
          steps {
            sh 'sleep 60'
            sh 'DOCKER_COMPOSE_FLAGS="-f docker-compose.ci.yml" make test_acceptance_app_run'
          }
        }

        stage('Package') {
          steps {
            sh 'sleep 90'
            sh 'echo ${BUILD_NUMBER} > build_number.txt'
            sh 'touch build.tar.gz' // Avoid tar warning about files changing during read
            sh 'DOCKER_COMPOSE_FLAGS="-f docker-compose.ci.yml" make tar'
          }
        }
      }

    }

    stage('Publish') {

      parallel {

        stage('Publish docker') {
          steps {
            withCredentials([file(credentialsId: 'gcr.io_overleaf-ops', variable: 'DOCKER_REPO_KEY_PATH')]) {
              sh 'docker login -u _json_key --password-stdin https://gcr.io/overleaf-ops < ${DOCKER_REPO_KEY_PATH}'
            }
            sh 'DOCKER_REPO=gcr.io/overleaf-ops make publish'
            sh 'docker logout https://gcr.io/overleaf-ops'
          }
        }

        stage('Publish to s3') {
          steps {
            sh 'echo ${BRANCH_NAME}-${BUILD_NUMBER} > build_number.txt'
            withAWS(credentials:'S3_CI_BUILDS_AWS_KEYS', region:"${S3_REGION_BUILD_ARTEFACTS}") {
              retry(3) {
                s3Upload(file:'build.tar.gz', bucket:"${S3_BUCKET_BUILD_ARTEFACTS}", path:"${JOB_NAME}/${BUILD_NUMBER}.tar.gz")
              }
            }
            withAWS(credentials:'S3_CI_BUILDS_AWS_KEYS', region:"${S3_REGION_BUILD_ARTEFACTS}") {
              retry(3) {
                // The deployment process uses this file to figure out the latest build
                s3Upload(file:'build_number.txt', bucket:"${S3_BUCKET_BUILD_ARTEFACTS}", path:"${JOB_NAME}/latest")
              }
            }
          }
        }

        stage('Sync OSS') {
          when {
            branch 'master'
          }
          steps {
            sshagent (credentials: ['GIT_DEPLOY_KEY']) {
              sh 'git push git@github.com:sharelatex/web-sharelatex.git HEAD:master'
            }
          }
        }

      }
    }
  }

  post {

    always {
      sh 'DOCKER_COMPOSE_FLAGS="-f docker-compose.ci.yml" make clean_ci || true'
    }
    
    success {
      withCredentials([usernamePassword(credentialsId: 'GITHUB_INTEGRATION', usernameVariable: 'GH_AUTH_USERNAME', passwordVariable: 'GH_AUTH_PASSWORD')]) {
        sh "curl $GIT_API_URL \
          --data '{ \
          \"state\" : \"success\", \
          \"target_url\": \"$TARGET_URL\", \
          \"description\": \"Your build succeeded!\", \
          \"context\": \"ci/jenkins\" }' \
          -u $GH_AUTH_USERNAME:$GH_AUTH_PASSWORD"
      }
    }

    failure {
      mail(from: "${EMAIL_ALERT_FROM}",
           to: "${EMAIL_ALERT_TO}",
           subject: "Jenkins build failed: ${JOB_NAME}:${BUILD_NUMBER}",
           body: "Build: ${BUILD_URL}")
      withCredentials([usernamePassword(credentialsId: 'GITHUB_INTEGRATION', usernameVariable: 'GH_AUTH_USERNAME', passwordVariable: 'GH_AUTH_PASSWORD')]) {
        sh "curl $GIT_API_URL \
          --data '{ \
          \"state\" : \"failure\", \
          \"target_url\": \"$TARGET_URL\", \
          \"description\": \"Your build failed\", \
          \"context\": \"ci/jenkins\" }' \
          -u $GH_AUTH_USERNAME:$GH_AUTH_PASSWORD"
      }
    }
  }

  // The options directive is for configuration that applies to the whole job.
  options {
    // we'd like to make sure remove old builds, so we don't fill up our storage!
    buildDiscarder(logRotator(numToKeepStr:'50'))

    // And we'd really like to be sure that this build doesn't hang forever, so let's time it out after:
    timeout(time: 30, unit: 'MINUTES')
  }
}
