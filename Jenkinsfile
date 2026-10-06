pipeline {
    agent any

    environment{
        IMAGE_NAME = 'simple-node-app'
        REPO_NAME = 'bee17'
        VERSION = 'V2'
    }

    stages{
        stage('Install dependency') {
            steps{
                bat "npm install"
                echo 'Dependencies installed!!!'
            }
        }

        stage('Testing stage') {
            steps{
                bat "node --test"
                echo "Test passed!!!"
            }
        }

        stage('Build docker image') {
            steps{
                bat "docker build -t ${IMAGE_NAME} ."
                echo "Image ${IMAGE_NAME} built successfully"

            }
        }

        stage('Pushing docker image') {
            steps{
                withCredentials([usernamePassword(credentialsId: 'docker-credentials', passwordVariable: 'DockerPwd', usernameVariable: 'DockerUname')]) {
                    bat "docker login -u ${DockerUname} -p ${DockerPwd}"
                    bat "docker tag ${IMAGE_NAME} ${REPO_NAME}/${IMAGE_NAME}:${VERSION}"
                    bat "docker push ${REPO_NAME}/${IMAGE_NAME}:${VERSION}"
                    echo "pushed image to docker successfully!"
                }
            }
        }
    }

    post{
        always{
            cleanWs()
            deleteDir()
            bat 'docker logout'
            echo 'Cleaning up resources...'
        }

        success{
               echo "Pipeline done seamlessly!!!" 
        }

        failure{
                echo "Pipeline failed, check logs!!"
        }
    }
}