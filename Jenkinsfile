pipeline {
    agent any

    environment{
        IMAGE_NAME = 'simple-node-app'
        VERSION = 'V1'
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
                echo "pushed image to docker successfully!"
            }
        }
    }
}