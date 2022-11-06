import bcrypt from 'bcrypt';

bcrypt.hash(process.argv[2], 10).then(t => {
    console.log(t);
});